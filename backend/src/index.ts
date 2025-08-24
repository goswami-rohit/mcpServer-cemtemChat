// mcpServer_cemtemChat/backend/src/index.ts

import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { Document } from "@langchain/core/documents";
// Removed MemoryVectorStore
import { QdrantVectorStore } from "@langchain/qdrant";
import { QdrantClient } from "@qdrant/js-client-rest";
import {
  RunnableSequence,
  RunnablePassthrough,
} from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Fix for __dirname not defined in ES module scope
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
dotenv.config();

// Initialize the Express app
const app = express();
const port = process.env.PORT || 3001;

// Middleware setup
app.use(cors());
app.use(express.json());

// You will need to set these environment variables in your Render service
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const QDRANT_URL = process.env.QDRANT_ENDPOINT_ID_URL; // Get URL from env
const QDRANT_API_KEY = process.env.QDRANT_API_KEY; // Get API key from env
const COLLECTION_NAME = "mcp_collection";

// Exit if the API key is not found to prevent errors
if (!GEMINI_API_KEY || !QDRANT_URL || !QDRANT_API_KEY) {
  throw new Error("Missing one or more required environment variables: GEMINI_API_KEY, QDRANT_URL, or QDRANT_API_KEY.");
}

// Global Qdrant client instance
const client = new QdrantClient({
    url: QDRANT_URL,
    apiKey: QDRANT_API_KEY,
});
const embeddings = new GoogleGenerativeAIEmbeddings({
    modelName: "text-embedding-004",
    apiKey: GEMINI_API_KEY,
});

// A function to set up the Qdrant collection once
async function bootstrapQdrant(reportData: any) {
    try {
        // Check if the collection already exists
        const collections = await client.getCollections();
        const collectionExists = collections.collections.some(
            (c: { name: string; }) => c.name === COLLECTION_NAME
        );

        if (collectionExists) {
            console.log(`Collection '${COLLECTION_NAME}' already exists. Skipping bootstrap.`);
            return;
        }

        console.log(`Collection '${COLLECTION_NAME}' not found. Creating and ingesting data...`);
        
        // 1. Create a document from the passed-in reportData
        const reportDocs = [new Document({ pageContent: JSON.stringify(reportData) })];

        // 2. Split the document for better retrieval
        const splitter = new RecursiveCharacterTextSplitter();
        const splitDocs = await splitter.splitDocuments(reportDocs);

        // 3. Add the documents to the Qdrant collection
        await QdrantVectorStore.fromDocuments(splitDocs, embeddings, {
            client,
            collectionName: COLLECTION_NAME,
        });

        console.log(`Data successfully ingested into Qdrant collection '${COLLECTION_NAME}'.`);

    } catch (error) {
        console.error("Error during Qdrant bootstrap process:", error);
    }
}

// Prisma Client initialization
const prisma = new PrismaClient();

// ------------------------------------------------------------------------------------------------
// Configure Express to serve the static frontend files
// ------------------------------------------------------------------------------------------------
// Set the frontend path
const frontendPath = path.join(__dirname, '..', '..', 'frontend', 'dist');
// Serve static files from the 'dist' directory
app.use(express.static(frontendPath));

// ------------------------------------------------------------------------------------------------
// The /chat endpoint
// This is the core API that will handle requests from your Next.js application.
// ------------------------------------------------------------------------------------------------
app.post('/chat', async (req, res) => {
    try {
        const { messages, reportData } = req.body;

        if (!messages || !Array.isArray(messages) || !reportData) {
            return res.status(400).json({ message: 'Missing required parameters.' });
        }
        
        // Bootstrap Qdrant with reportData on the first call if not already done.
        // This is a simple way to ensure the collection exists. A more robust solution
        // would be to use a separate script or a dedicated start-up process.
        await bootstrapQdrant(reportData);

        // Create a retriever for the existing collection
        const vectorStore = new QdrantVectorStore(embeddings, {
            client,
            collectionName: COLLECTION_NAME,
        });

        const retriever = vectorStore.asRetriever();

        // 4. Create a LangChain Runnable Sequence for the RAG pipeline
        const model = new ChatGoogleGenerativeAI({
            model: "gemini-pro",
            apiKey: GEMINI_API_KEY,
        });

        const prompt = ChatPromptTemplate.fromMessages([
          ["human", `
            Answer the user's question based on the provided document content and the chat history.
            If the question cannot be answered from the document, state that you do not have enough information.
            
            Document Content:
            {context}

            Chat History:
            {chat_history}

            User's Question:
            {question}
          `],
        ]);

        const chain = RunnableSequence.from([
          {
            context: (input) => retriever.invoke(input.messages[input.messages.length - 1].content),
            chat_history: (input) => input.messages,
            question: (input) => input.messages[input.messages.length - 1].content,
          },
          prompt,
          model,
          new StringOutputParser(),
        ]);

        // 5. Invoke the chain to get the AI response
        const result = await chain.invoke({
          messages: messages, // Pass the entire messages array here
        });
        
        // 6. Send the AI's response back
        res.status(200).json({ response: result });

    } catch (error) {
        console.error("Error in /chat endpoint:", error);
        res.status(500).json({ message: 'An error occurred while processing your request.' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`MCP Server running on http://localhost:${port}`);
});
