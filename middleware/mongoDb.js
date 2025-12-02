const { MongoClient } = require('mongodb');

const mongoConnect = async () => {
    try{
    // connect to DB
    const client = await MongoClient(process.env.MONGO_URI);
    return client;
    }catch(err){
        console.error('Failed to connect to Client:', err);
        process.exit(1);
    }
};

module.exports = mongoConnect;