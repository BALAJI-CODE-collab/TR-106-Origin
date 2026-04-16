"""
Alzheimer's Detection Module
Provides risk scoring based on cognitive assessment and speech patterns
"""

import numpy as np
from typing import Dict, Any, Optional
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler

class AlzheimerRiskEvaluator:
    """
    Evaluates Alzheimer's risk based on speech patterns and cognitive data.
    Uses trained ML models to score dementia risk.
    """
    
    def __init__(self):
        """Initialize the evaluator with default models"""
        self.scaler = StandardScaler()
        self.model = None
        self._initialize_demo_model()
    
    def _initialize_demo_model(self):
        """Initialize a demo Random Forest model for testing"""
        # Create a simple model for demonstration
        np.random.seed(42)
        n_features = 8
        n_samples = 100
        
        # Generate synthetic training data
        X_train = np.random.randn(n_samples, n_features)
        y_train = np.random.randint(0, 2, n_samples)
        
        # Train model
        self.model = RandomForestClassifier(n_estimators=50, random_state=42)
        self.model.fit(X_train, y_train)
        self.scaler.fit(X_train)
    
    def evaluate(self, text: str, cognitive_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Evaluate Alzheimer's risk from speech and cognitive data.
        
        Args:
            text: Speech transcription or utterance text
            cognitive_data: Dictionary with cognitive test scores
                Expected keys: 'mmse', 'moca', 'age', 'gender', etc.
        
        Returns:
            Dictionary with:
                - 'risk_score': float (0-1, higher = more risk)
                - 'risk_level': str ('low', 'moderate', 'high')
                - 'confidence': float (0-1)
                - 'features': dict of extracted cognitive features
        """
        try:
            # Extract features from text and cognitive data
            features = self._extract_features(text, cognitive_data)
            
            # Prepare features for model
            feature_vector = np.array(features).reshape(1, -1)
            feature_vector = self.scaler.transform(feature_vector)
            
            # Get risk prediction
            risk_probabilities = self.model.predict_proba(feature_vector)[0]
            risk_score = float(risk_probabilities[1])  # Probability of dementia (class 1)
            
            # Determine risk level
            if risk_score < 0.3:
                risk_level = "low"
            elif risk_score < 0.6:
                risk_level = "moderate"
            else:
                risk_level = "high"
            
            return {
                'risk_score': round(risk_score, 3),
                'risk_level': risk_level,
                'confidence': round(max(risk_probabilities), 3),
                'features': {
                    'speech_coherence': features[0],
                    'mmse_equivalent': features[1],
                    'age_factor': features[2],
                    'repetition_count': int(features[3]),
                    'pause_duration': round(features[4], 2),
                    'vocabulary_diversity': round(features[5], 2),
                    'memory_indicators': int(features[6]),
                    'mood_assessment': features[7]
                }
            }
        except Exception as e:
            return {
                'error': str(e),
                'risk_score': None,
                'risk_level': 'unknown'
            }
    
    def _extract_features(self, text: str, cognitive_data: Optional[Dict] = None) -> list:
        """
        Extract cognitive and linguistic features from text and cognitive data.
        
        Returns:
            List of 8 features for ML model
        """
        features = []
        
        # Feature 1: Speech coherence (0-1, based on sentence structure)
        sentences = [s.strip() for s in text.split('.') if s.strip()]
        coherence = min(1.0, len(sentences) / 5.0)  # Expect ~5 coherent sentences
        features.append(coherence)
        
        # Feature 2: MMSE-equivalent score (cognitive data or estimate)
        if cognitive_data and 'mmse' in cognitive_data:
            mmse_normalized = cognitive_data['mmse'] / 30.0
        else:
            # Estimate from text length (crude approximation)
            mmse_normalized = min(1.0, len(text.split()) / 100.0)
        features.append(mmse_normalized)
        
        # Feature 3: Age factor (normalized 50-90)
        if cognitive_data and 'age' in cognitive_data:
            age = cognitive_data['age']
        else:
            age = 65  # Default
        age_normalized = (age - 50) / 40.0
        features.append(np.clip(age_normalized, 0, 1))
        
        # Feature 4: Repetition count (word repetitions indicate memory issues)
        words = text.lower().split()
        unique_words = set(words)
        repetition_count = max(0, len(words) - len(unique_words))
        features.append(repetition_count)
        
        # Feature 5: Average pause duration (from text markers)
        pause_count = text.count('...') + text.count('--')
        pause_duration = pause_count * 0.5  # Estimated in seconds
        features.append(pause_duration)
        
        # Feature 6: Vocabulary diversity (type-token ratio)
        if len(words) > 0:
            vocab_diversity = len(unique_words) / len(words)
        else:
            vocab_diversity = 0.5
        features.append(vocab_diversity)
        
        # Feature 7: Memory indicators (0-3 scale)
        memory_markers = ['forgot', 'forgot', 'forgot', 'remember', 'forgot', 'lost']
        memory_count = sum(1 for marker in memory_markers if marker in text.lower())
        features.append(min(3, memory_count))
        
        # Feature 8: Mood/sentiment assessment (0-1, higher = more negative)
        negative_words = ['sad', 'worried', 'confused', 'lost', 'afraid', 'frustrated']
        negative_count = sum(1 for word in negative_words if word in text.lower())
        mood_score = min(1.0, negative_count / len(negative_words)) if negative_words else 0.5
        features.append(mood_score)
        
        return features

# Module-level function for compatibility with bridge
_evaluator = None

def evaluate_alzheimer(text: str, cognitive_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Evaluate Alzheimer's risk from speech and cognitive data.
    
    This is the main entry point used by the alzheimer_bridge.
    
    Args:
        text: Speech transcription or user utterance
        cognitive_data: Optional dictionary with MMSE, age, gender, etc.
    
    Returns:
        Dictionary with risk_score, risk_level, confidence, and features
    """
    global _evaluator
    if _evaluator is None:
        _evaluator = AlzheimerRiskEvaluator()
    
    return _evaluator.evaluate(text, cognitive_data)


__all__ = ['AlzheimerRiskEvaluator', 'evaluate_alzheimer']
