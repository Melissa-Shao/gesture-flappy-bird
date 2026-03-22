from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import torch
import torch.nn as nn

LANDMARKS_COUNT = 21 * 3 
class GestureNet(nn.Module):
    def __init__(self):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(LANDMARKS_COUNT, 128),
            nn.ReLU(),
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Linear(64, 2)
        )

    def forward(self, x):
        return self.net(x)


app = FastAPI()

# CORS settings 
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model = GestureNet()
model.load_state_dict(torch.load("../ml/gesture_model.pth", map_location=torch.device("cpu")))
model.eval() # Set the model to evaluation mode, which disables features like dropout and batch normalization that are only used during training.

# Define the input data model for the /predict endpoint
class LandmarkInput(BaseModel):
    landmarks: list[float]

# model will give output as 0 or 1, we need to map it back to "idle" or "jump"
label_map_reverse = {
    0: "idle",
    1: "jump"
}


@app.get("/")
def root():
    return {"message": "Gesture API is running"}


@app.post("/predict")
def predict(data: LandmarkInput):
    if len(data.landmarks) != LANDMARKS_COUNT:
        return {"error": f"Expected {LANDMARKS_COUNT} numbers"}

    x = torch.tensor([data.landmarks], dtype=torch.float32)

    with torch.no_grad():
        output = model(x)
        # torch.argmax returns the index of the maximum value in the output tensor, dim=1 specifies the dimension along which to find the maximum.item() converts the resulting tensor to a Python scalar.
        pred = torch.argmax(output, dim=1).item()

    return {"gesture": label_map_reverse[pred]}