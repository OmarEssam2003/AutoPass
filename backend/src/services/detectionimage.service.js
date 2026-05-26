const { getMongoDB } = require('../config/mongodb');
const { Binary }     = require('mongodb');

const COLLECTION = 'detection_event_images';

// ─────────────────────────────────────────────────────────────────────────────
// STORE DETECTION EVENT IMAGE IN MONGODB
//
// Called during detection event creation.
// Stores the raw image buffer + metadata in MongoDB and returns the doc ID
// which is then saved to PostgreSQL as detection_events.image_url.
//
// @param {Buffer} imageBuffer  - Raw image buffer from multer
// @param {string} mimeType     - e.g. 'image/jpeg'
// @param {string} filename     - Original filename from the Pi
// @param {string} gate_id      - Gate that captured the image (for indexing)
// @returns {string}            - MongoDB document ID
// ─────────────────────────────────────────────────────────────────────────────
const storeDetectionImage = async (imageBuffer, mimeType, filename, gate_id) => {
  const db         = getMongoDB();
  const collection = db.collection(COLLECTION);

  const doc = {
    gate_id,
    image: {
      data:       new Binary(imageBuffer),
      mimeType,
      filename,
      size_bytes: imageBuffer.length,
    },
    created_at: new Date(),
  };

  const result = await collection.insertOne(doc);
  const docId  = result.insertedId.toString();

  console.log(`[detectionImage] Stored image in MongoDB — doc ID: ${docId}`);
  return docId;
};

module.exports = { storeDetectionImage };