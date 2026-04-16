import os
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import matplotlib.pyplot as plt
import seaborn as sns

# Import our custom classes
from data.download_data import AlzheimerDataLoader

class AlzheimerML:
    def __init__(self):
        self.models = {}
        
    def train_models(self, X_train, X_test, y_train, y_test):
        """Train multiple ML models for Alzheimer's detection"""
        from sklearn.ensemble import RandomForestClassifier
        from sklearn.svm import SVC
        from sklearn.linear_model import LogisticRegression
        from sklearn.tree import DecisionTreeClassifier
        from sklearn.neighbors import KNeighborsClassifier
        
        models = {
            'Random Forest': RandomForestClassifier(n_estimators=100, random_state=42),
            'SVM': SVC(kernel='rbf', random_state=42),
            'Logistic Regression': LogisticRegression(random_state=42),
            'Decision Tree': DecisionTreeClassifier(random_state=42),
            'K-Nearest Neighbors': KNeighborsClassifier()
        }
        
        results = {}
        
        for name, model in models.items():
            print(f"Training {name}...")
            model.fit(X_train, y_train)
            y_pred = model.predict(X_test)
            accuracy = accuracy_score(y_test, y_pred)
            
            results[name] = {
                'model': model,
                'accuracy': accuracy,
                'predictions': y_pred
            }
            print(f"    Accuracy: {accuracy:.3f}")
        
        return results
    
    def evaluate_models(self, results, y_test):
        """Evaluate and compare all models"""
        best_model_name = max(results.keys(), key=lambda x: results[x]['accuracy'])
        best_accuracy = results[best_model_name]['accuracy']
        
        print(f"\n BEST MODEL: {best_model_name} (Accuracy: {best_accuracy:.3f})")
        
        # Detailed report for best model
        best_model = results[best_model_name]['model']
        y_pred = results[best_model_name]['predictions']
        
        print(f"\nDetailed Classification Report:")
        print(classification_report(y_test, y_pred, target_names=['Healthy', 'Alzheimer']))
        
        return best_model_name, best_accuracy

def main():
    print("=" * 60)
    print(" ALZHEIMER'S DISEASE DETECTION USING MACHINE LEARNING")
    print("=" * 60)
    
    # Step 1: Load the dataset
    print("\n1️ LOADING OASIS ALZHEIMER'S DATASET...")
    loader = AlzheimerDataLoader()
    df = loader.load_oasis_data()
    
    if df is None:
        print(" Failed to load dataset. Please check file location.")
        return
    
    # Step 2: Prepare features and target
    print("\n2️ PREPARING DATA FOR TRAINING...")
    
    # Select features for training
    feature_columns = ['Age', 'Educ', 'SES', 'MMSE', 'eTIV', 'nWBV', 'ASF', 'Gender']
    X = df[feature_columns]
    y = df['Alzheimer_Status']  # 0 = Healthy, 1 = Alzheimer's/MCI
    
    print(f"   Features: {', '.join(feature_columns)}")
    print(f"   Target: Alzheimer_Status (0=Healthy, 1=Dementia)")
    print(f"   Dataset shape: {X.shape}")
    
    # Step 3: Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    # Scale features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    print(f"   Training samples: {X_train.shape[0]}")
    print(f"   Testing samples: {X_test.shape[0]}")
    
    # Step 4: Train models
    print("\n3️ TRAINING MACHINE LEARNING MODELS...")
    ml_pipeline = AlzheimerML()
    results = ml_pipeline.train_models(X_train_scaled, X_test_scaled, y_train, y_test)
    
    # Step 5: Evaluate results
    print("\n4️EVALUATING MODEL PERFORMANCE...")
    best_model, best_accuracy = ml_pipeline.evaluate_models(results, y_test)
    
    # Step 6: Visualize results
    print("\n5️GENERATING VISUALIZATIONS...")
    visualize_results(df, results, y_test)
    
    # Step 7: Save results
    print("\n6️SAVING RESULTS...")
    save_results(df, results, X_test, y_test)
    
    print("\n" + "=" * 60)
    print(" ALZHEIMER'S DETECTION PIPELINE COMPLETED!")
    print("=" * 60)

def visualize_results(df, results, y_test):
    """Create visualizations for Alzheimer's detection"""
    os.makedirs('results', exist_ok=True)
    
    # 1. Alzheimer's distribution
    plt.figure(figsize=(10, 5))
    
    plt.subplot(1, 2, 1)
    df['Alzheimer_Status'].value_counts().plot(kind='bar', color=['skyblue', 'lightcoral'])
    plt.title('Alzheimer\'s Distribution\n(0=Healthy, 1=Dementia)')
    plt.xlabel('Status')
    plt.ylabel('Count')
    
    # 2. Model comparison
    plt.subplot(1, 2, 2)
    model_names = list(results.keys())
    accuracies = [results[name]['accuracy'] for name in model_names]
    
    bars = plt.bar(model_names, accuracies, color=['#2ecc71', '#3498db', '#e74c3c', '#f39c12', '#9b59b6'])
    plt.title('Model Accuracy Comparison')
    plt.ylabel('Accuracy')
    plt.xticks(rotation=45)
    plt.ylim(0, 1)
    
    # Add accuracy values on bars
    for bar, acc in zip(bars, accuracies):
        plt.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.01, 
                f'{acc:.3f}', ha='center', va='bottom')
    
    plt.tight_layout()
    plt.savefig('results/alzheimer_results.png', dpi=300, bbox_inches='tight')
    plt.show()
    
    # 3. Confusion matrix for best model
    best_model_name = max(results.keys(), key=lambda x: results[x]['accuracy'])
    y_pred = results[best_model_name]['predictions']
    
    plt.figure(figsize=(6, 5))
    cm = confusion_matrix(y_test, y_pred)
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues')
    plt.title(f'Confusion Matrix - {best_model_name}\n(Alzheimer\'s Detection)')
    plt.ylabel('Actual')
    plt.xlabel('Predicted')
    plt.savefig('results/confusion_matrix.png', dpi=300, bbox_inches='tight')
    plt.show()

def save_results(df, results, X_test, y_test):
    """Save results to files"""
    # Save model comparison
    comparison_df = pd.DataFrame([
        {'Model': name, 'Accuracy': result['accuracy']} 
        for name, result in results.items()
    ])
    comparison_df.to_csv('results/model_comparison.csv', index=False)
    
    # Save predictions
    best_model_name = max(results.keys(), key=lambda x: results[x]['accuracy'])
    y_pred = results[best_model_name]['predictions']
    
    predictions_df = pd.DataFrame({
        'Actual': y_test,
        'Predicted': y_pred,
        'Correct': y_test == y_pred
    })
    predictions_df.to_csv('results/predictions.csv', index=False)
    
    print("   Results saved to 'results/' folder")

if __name__ == "__main__":
    main()
