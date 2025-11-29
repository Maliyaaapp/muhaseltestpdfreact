// Debug script for Appwrite issues
import { Client, Databases, Account } from 'node-appwrite';

// Init SDK
const client = new Client();

client
    .setEndpoint('https://fra.cloud.appwrite.io/v1')
    .setProject('681afa81001965d1f562');

const databases = new Databases(client);
const account = new Account(client);

const DATABASE_ID = '681afac100096bf95c8a';
const USERS_COLLECTION_ID = '681afafb0007a8105c79';

async function checkDocument(documentId) {
    try {
        const doc = await databases.getDocument(DATABASE_ID, USERS_COLLECTION_ID, documentId);
        console.log('Document found:');
        console.log(JSON.stringify(doc, null, 2));
        return true;
    } catch (error) {
        console.error('Error fetching document:', error);
        return false;
    }
}

async function listAllUsers() {
    try {
        const response = await databases.listDocuments(DATABASE_ID, USERS_COLLECTION_ID);
        console.log('Found', response.documents.length, 'users:');
        response.documents.forEach(doc => {
            console.log(`- ID: ${doc.$id}, Name: ${doc.name}, Email: ${doc.email}, Role: ${doc.role}`);
        });
        return response.documents;
    } catch (error) {
        console.error('Error listing users:', error);
        return [];
    }
}

async function main() {
    console.log('Checking specific document...');
    const specificDoc = '681b01da0030f20af8ce';
    await checkDocument(specificDoc);

    console.log('\nListing all users...');
    await listAllUsers();
}

main().catch(err => {
    console.error('Unhandled error:', err);
}); 