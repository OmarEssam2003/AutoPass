const { getMongoDB }        = require('../config/mongodb');
const { extractNationalId } = require('./ocr.service');
const { Binary }            = require('mongodb');

const COLLECTION = 'national_id_documents';

const verifyAndStoreNationalId = async (imageBuffer, mimeType, filename, enteredId) => {

  // ── Step 1 & 2: OCR ───────────────────────────────────────────────────────
  const { extractedId, rawText } = await extractNationalId(imageBuffer, mimeType, filename);

  // ── Step 3: Validate ──────────────────────────────────────────────────────
  if (!extractedId) {
    const err = new Error(
      'Could not find a 14-digit national ID number in the uploaded image. ' +
      'Please make sure the full national ID is visible, well-lit, and in focus.'
    );
    err.statusCode = 422;
    err.code = 'OCR_ID_NOT_FOUND';
    throw err;
  }

  const normalised = enteredId.trim();
  console.log(`[nationalId] Extracted : ${extractedId}`);
  console.log(`[nationalId] Entered   : ${normalised}`);
  console.log(`[nationalId] Match     : ${extractedId === normalised}`);

  if (extractedId !== normalised) {
    const err = new Error(
      'The national ID in the image does not match the national ID you entered manually. ' +
      'Please make sure both are identical and the image is clear.'
    );
    err.statusCode = 422;
    err.code = 'OCR_ID_MISMATCH';
    throw err;
  }

  // ── Step 4: Store in MongoDB ──────────────────────────────────────────────
  // imageBuffer is a Node.js Buffer — wrap in MongoDB Binary so the driver
  // stores it correctly as BSON binary data instead of a plain object
  console.log('[nationalId] Connecting to MongoDB...');
  const db         = getMongoDB();
  const collection = db.collection(COLLECTION);

  const doc = {
    national_id: extractedId,
    image: {
      data:     new Binary(imageBuffer),  // BSON binary — correct way to store buffers
      mimeType,
      filename,
      size_bytes: imageBuffer.length,
    },
    ocr: {
      raw_text:     rawText,
      extracted_id: extractedId,
      verified:     true,
    },
    created_at: new Date(),
  };

  console.log('[nationalId] Inserting document into MongoDB...');
  let mongoDocId;
  try {
    const result = await collection.insertOne(doc);
    mongoDocId   = result.insertedId.toString();
    console.log('[nationalId] MongoDB insert OK — doc ID:', mongoDocId);
  } catch (mongoErr) {
    console.error('[nationalId] MongoDB insert FAILED:', mongoErr.message);
    throw mongoErr;
  }

  return mongoDocId;
};

module.exports = { verifyAndStoreNationalId };