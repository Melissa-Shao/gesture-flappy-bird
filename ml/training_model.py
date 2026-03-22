import json
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from sklearn.model_selection import train_test_split


LANDMARKS_COUNT = 21 * 3  # 21 landmarks with x, y, z coordinates

# 1. load dataset
with open("gesture_dataset.json", "r", encoding="utf-8") as f:
    data = json.load(f)

X = []  # landmark features
y = []  # labels (0 for idle, 1 for jump)

label_map = {
    "idle": 0,
    "jump": 1
}

for item in data:
    landmarks = item["landmarks"]
    label = item["label"]

    if len(landmarks) == LANDMARKS_COUNT and label in label_map:
        X.append(landmarks)
        y.append(label_map[label])

# convert python lists to numpy arrays
X = np.array(X, dtype=np.float32)
y = np.array(y, dtype=np.int64)

# 2. split train/test
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# convert numpy arrays to PyTorch tensors, because PyTorch models work with tensors and cannot directly use numpy arrays.
X_train = torch.tensor(X_train)
X_test = torch.tensor(X_test)
y_train = torch.tensor(y_train)
y_test = torch.tensor(y_test)

# 3. define model
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

model = GestureNet()

# 4. loss and optimizer
criterion = nn.CrossEntropyLoss() # CrossEntropyLoss is a loss function commonly used for multi-class classification problems. It combines LogSoftmax and NLLLoss in one single class, making it suitable for our binary classification task (idle vs jump).
optimizer = optim.Adam(model.parameters(), lr=0.001)

# 5. training loop
epochs = 50

for epoch in range(epochs):
    model.train() # Set the model to training mode, which enables features like dropout and batch normalization that are only used during training.

    outputs = model(X_train)
    loss = criterion(outputs, y_train)

    optimizer.zero_grad() # Clear the gradients of the last step (otherwise they would accumulate)
    loss.backward() 
    optimizer.step() # update the model parameters 

    if (epoch + 1) % 10 == 0:
        _, predicted = torch.max(outputs, 1)
        accuracy = (predicted == y_train).float().mean().item()
        print(f"Epoch {epoch + 1}/{epochs}, Loss: {loss.item():.4f}, Train Acc: {accuracy:.4f}")

# 6. evaluate
model.eval()
with torch.no_grad():
    test_outputs = model(X_test)
    _, test_pred = torch.max(test_outputs, 1)
    test_acc = (test_pred == y_test).float().mean().item()
    print(f"Test Accuracy: {test_acc:.4f}")

# 7. save model
torch.save(model.state_dict(), "gesture_model.pth")
print("Model saved as gesture_model.pth")