import express from "express";
import multer from "multer";
import cloudinary from "cloudinary";
import { authenticate } from "../middleware/auth.js";

// Config Cloudinary
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const router = express.Router();

// Multer memory storage (NO archivos en Render)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Upload route
router.post("/", authenticate, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    // Subir a Cloudinary desde buffer
    const result = await cloudinary.v2.uploader.upload_stream(
      { folder: "alquilercordoba" },
      (error, uploadResult) => {
        if (error) return res.status(500).json({ error: "Cloudinary upload error" });
        res.json({ file_url: uploadResult.secure_url });
      }
    );

    result.end(req.file.buffer);

  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
});

export default router;
