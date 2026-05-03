import os
import io
import numpy as np
from PIL import Image
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
import tensorflow as tf

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_PATH = "model/model.keras"
model = tf.keras.models.load_model(MODEL_PATH)
class_names = ['glioma', 'meningioma', 'notumor', 'pituitary']

from fastapi.concurrency import run_in_threadpool

def preprocess_image(image_bytes):
    img = Image.open(io.BytesIO(image_bytes)).convert('RGB')
    img = img.resize((224, 224))
    img_array = np.array(img).astype('float32') / 255.0
    img_array = np.expand_dims(img_array, axis=0)
    return img_array

async def get_prediction(processed_img):
    return await run_in_threadpool(model.predict, processed_img)

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    contents = await file.read()
    processed_img = preprocess_image(contents)
    predictions = await get_prediction(processed_img)
    pred_idx = np.argmax(predictions[0])
    confidence = float(np.max(predictions[0]))
    
    return {
        "class": class_names[pred_idx],
        "confidence": confidence,
        "probabilities": {class_names[i]: float(predictions[0][i]) for i in range(len(class_names))}
    }

@app.get("/")
async def read_index():
    with open("template/index.html", "r") as f:
        return HTMLResponse(content=f.read(), status_code=200)

app.mount("/static", StaticFiles(directory="template"), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7860)
