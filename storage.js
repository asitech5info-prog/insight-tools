const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

/**
 * Initializes and returns the Supabase client
 * using SUPABASE_URL and SUPABASE_KEY from environment variables.
 *
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('SUPABASE_URL and SUPABASE_KEY environment variables are required.');
  }

  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Uploads a file to the Supabase 'uploads' storage bucket.
 *
 * @param {string|Buffer|Uint8Array|ArrayBuffer|ReadableStream} file - Local file path string, Buffer, or stream.
 * @param {string} [destinationPath] - Remote file path/name in the 'uploads' bucket.
 * @param {Object} [options] - Optional upload configuration.
 * @param {string} [options.bucket='uploads'] - Bucket name (defaults to 'uploads').
 * @param {string} [options.contentType] - MIME content type (e.g. 'application/pdf').
 * @param {boolean} [options.upsert=false] - Whether to overwrite an existing file with the same name.
 * @returns {Promise<{data: Object, publicUrl: string|null}>}
 */
async function uploadFile(file, destinationPath, options = {}) {
  const supabase = getSupabaseClient();
  const bucketName = options.bucket || 'uploads';
  const upsert = options.upsert !== undefined ? options.upsert : false;

  let fileBody = file;
  let remotePath = destinationPath;

  // Handle local file path string
  if (typeof file === 'string') {
    if (!fs.existsSync(file)) {
      throw new Error(`File not found at path: ${file}`);
    }
    fileBody = fs.readFileSync(file);
    if (!remotePath) {
      remotePath = path.basename(file);
    }
  }

  if (!remotePath) {
    throw new Error('destinationPath is required when uploading in-memory buffers or streams.');
  }

  const uploadOptions = {
    upsert,
    ...(options.contentType ? { contentType: options.contentType } : {})
  };

  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(remotePath, fileBody, uploadOptions);

    if (error) {
      throw error;
    }

    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(remotePath);

    return {
      data,
      publicUrl: publicUrlData ? publicUrlData.publicUrl : null
    };
  } finally {
    // Explicitly release file buffer references so GC reclaims memory immediately
    fileBody = null;
  }
}

module.exports = {
  getSupabaseClient,
  uploadFile,
  upload: uploadFile
};
