# ml-service/main.py
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Optional, AsyncGenerator
import asyncio
import json
import torch
from transformers import (
    AutoTokenizer, AutoModelForSeq2SeqLM, 
    AutoModel, pipeline
)
import spacy
import numpy as np
from sentence_transformers import SentenceTransformer
import logging
import time
import uvicorn

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Text Humanization Service", version="1.0.0")

# Global model storage
models = {}

class HumanizationRequest(BaseModel):
    text: str
    user_id: str
    user_patterns: Optional[Dict] = None
    target_style: Optional[str] = "natural"
    preserve_meaning: bool = True

class UserPattern(BaseModel):
    sentence_lengths: List[int]
    vocabulary_preferences: Dict[str, str]
    common_phrases: List[str]
    writing_style_markers: Dict[str, float]

# Model initialization
async def initialize_models():
    """Initialize all ML models on startup"""
    logger.info("Initializing ML models...")
    
    try:
        # Phase 3: Style Transfer Engine
        logger.info("Loading FLAN-T5-Large for style transfer...")
        models['style_tokenizer'] = AutoTokenizer.from_pretrained('google/flan-t5-large')
        models['style_model'] = AutoModelForSeq2SeqLM.from_pretrained(
            'google/flan-t5-large',
            torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
            device_map="auto" if torch.cuda.is_available() else None
        )
        
        # Backup models
        logger.info("Loading BART for complex restructuring...")
        models['bart_tokenizer'] = AutoTokenizer.from_pretrained('facebook/bart-large')
        models['bart_model'] = AutoModelForSeq2SeqLM.from_pretrained('facebook/bart-large')
        
        # Phase 4: Multi-Layer Pipeline Models
        logger.info("Loading sentence transformer for semantic similarity...")
        models['semantic_model'] = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
        
        # spaCy for structural analysis
        logger.info("Loading spaCy model...")
        try:
            models['nlp'] = spacy.load("en_core_web_lg")
        except OSError:
            logger.warning("en_core_web_lg not found, using en_core_web_sm")
            models['nlp'] = spacy.load("en_core_web_sm")
        
        # T5-small for authenticity injection
        logger.info("Loading T5-small for authenticity...")
        models['auth_tokenizer'] = AutoTokenizer.from_pretrained('t5-small')
        models['auth_model'] = AutoModelForSeq2SeqLM.from_pretrained('t5-small')
        
        logger.info("All models loaded successfully!")
        
    except Exception as e:
        logger.error(f"Failed to initialize models: {e}")
        raise

class TextHumanizer:
    """Main humanization pipeline"""
    
    def __init__(self):
        self.models = models
    
    async def analyze_user_patterns(self, text: str) -> Dict:
        """Layer 1: Analyze user's writing patterns"""
        doc = self.models['nlp'](text)
        
        sentence_lengths = []
        sentences = list(doc.sents)
        
        for sent in sentences:
            sentence_lengths.append(len(sent.text.split()))
        
        # Calculate statistics
        patterns = {
            'avg_sentence_length': np.mean(sentence_lengths) if sentence_lengths else 15,
            'sentence_length_std': np.std(sentence_lengths) if sentence_lengths else 5,
            'sentence_lengths': sentence_lengths[:50],  # Store sample for analysis
            'vocab_complexity': self._analyze_vocabulary_complexity(doc),
            'sentence_structures': self._analyze_sentence_structures(sentences[:20])
        }
        
        return patterns
    
    def _analyze_vocabulary_complexity(self, doc) -> Dict:
        """Analyze vocabulary patterns"""
        word_lengths = [len(token.text) for token in doc if token.is_alpha]
        pos_counts = {}
        
        for token in doc:
            if token.pos_ in pos_counts:
                pos_counts[token.pos_] += 1
            else:
                pos_counts[token.pos_] = 1
        
        return {
            'avg_word_length': np.mean(word_lengths) if word_lengths else 5,
            'pos_distribution': pos_counts,
            'unique_word_ratio': len(set(token.lemma_ for token in doc if token.is_alpha)) / len([t for t in doc if t.is_alpha]) if doc else 0.5
        }
    
    def _analyze_sentence_structures(self, sentences) -> List[str]:
        """Extract common sentence structures"""
        structures = []
        for sent in sentences:
            # Simplified structure analysis
            structure = ' '.join([token.pos_ for token in sent if not token.is_space])
            structures.append(structure)
        return structures[:10]  # Return top 10 patterns
    
    async def structural_humanization(self, text: str, user_patterns: Dict) -> str:
        """Layer 1: Structural Humanization"""
        logger.info("Starting structural humanization...")
        
        doc = self.models['nlp'](text)
        sentences = list(doc.sents)
        
        target_avg_length = user_patterns.get('avg_sentence_length', 15)
        target_std = user_patterns.get('sentence_length_std', 5)
        
        restructured_sentences = []
        
        for sent in sentences:
            current_length = len(sent.text.split())
            
            # If sentence is too long, try to split
            if current_length > target_avg_length + target_std:
                restructured = await self._split_sentence(sent.text)
                restructured_sentences.extend(restructured)
            # If too short, try to combine with context
            elif current_length < target_avg_length - target_std:
                restructured_sentences.append(sent.text)
            else:
                restructured_sentences.append(sent.text)
        
        return ' '.join(restructured_sentences)
    
    async def _split_sentence(self, sentence: str) -> List[str]:
        """Split overly long sentences"""
        # Use BART for sentence restructuring
        tokenizer = self.models['bart_tokenizer']
        model = self.models['bart_model']
        
        prompt = f"Rewrite this sentence into 2-3 shorter, natural sentences: {sentence}"
        
        inputs = tokenizer(prompt, return_tensors="pt", max_length=512, truncation=True)
        
        with torch.no_grad():
            outputs = model.generate(
                inputs.input_ids,
                max_length=256,
                num_beams=4,
                temperature=0.7,
                do_sample=True
            )
        
        result = tokenizer.decode(outputs[0], skip_special_tokens=True)
        
        # Split by periods and clean
        split_sentences = [s.strip() + '.' for s in result.split('.') if s.strip()]
        return split_sentences if len(split_sentences) > 1 else [sentence]
    
    async def vocabulary_adaptation(self, text: str, user_patterns: Dict) -> str:
        """Layer 2: Vocabulary Adaptation"""
        logger.info("Starting vocabulary adaptation...")
        
        # Simple vocabulary replacement based on formality level
        vocab_replacements = {
            # AI-typical words to human alternatives
            'utilize': 'use',
            'facilitate': 'help',
            'demonstrate': 'show',
            'implement': 'do',
            'consequently': 'so',
            'furthermore': 'also',
            'nevertheless': 'but',
            'comprehensive': 'complete'
        }
        
        # Apply replacements
        adapted_text = text
        for ai_word, human_word in vocab_replacements.items():
            adapted_text = adapted_text.replace(ai_word, human_word)
        
        return adapted_text
    
    async def authenticity_injection(self, text: str) -> str:
        """Layer 3: Authenticity Injection"""
        logger.info("Starting authenticity injection...")
        
        tokenizer = self.models['auth_tokenizer']
        model = self.models['auth_model']
        
        prompt = f"Rewrite this text to sound more natural and human, with minor imperfections: {text}"
        
        inputs = tokenizer(
            prompt, 
            return_tensors="pt", 
            max_length=512, 
            truncation=True
        )
        
        with torch.no_grad():
            outputs = model.generate(
                inputs.input_ids,
                max_length=len(inputs.input_ids[0]) + 100,
                temperature=0.8,
                do_sample=True,
                top_p=0.9,
                pad_token_id=tokenizer.eos_token_id
            )
        
        result = tokenizer.decode(outputs[0], skip_special_tokens=True)
        
        # Remove the prompt from the result
        if prompt in result:
            result = result.replace(prompt, "").strip()
        
        return result if result else text
    
    async def personal_voice_integration(self, text: str, user_patterns: Dict) -> str:
        """Layer 4: Personal Voice Integration"""
        logger.info("Starting personal voice integration...")
        
        # Insert user's common phrases at natural points
        common_phrases = user_patterns.get('common_phrases', [])
        
        if not common_phrases:
            return text
        
        # Simple integration - add transition phrases
        sentences = text.split('.')
        enhanced_sentences = []
        
        for i, sentence in enumerate(sentences):
            if sentence.strip():
                enhanced_sentences.append(sentence.strip())
                
                # Occasionally add personal phrases as transitions
                if i < len(sentences) - 1 and len(common_phrases) > 0:
                    if np.random.random() < 0.3:  # 30% chance
                        phrase = np.random.choice(common_phrases)
                        enhanced_sentences.append(f" {phrase},")
        
        return '. '.join(enhanced_sentences)
    
    async def coherence_preservation(self, original: str, modified: str) -> tuple[str, float]:
        """Layer 5: Coherence Preservation"""
        logger.info("Checking coherence preservation...")
        
        # Calculate semantic similarity
        original_embedding = self.models['semantic_model'].encode([original])
        modified_embedding = self.models['semantic_model'].encode([modified])
        
        similarity = np.dot(original_embedding[0], modified_embedding[0]) / (
            np.linalg.norm(original_embedding[0]) * np.linalg.norm(modified_embedding[0])
        )
        
        # If similarity is too low, revert to less aggressive changes
        if similarity < 0.85:
            logger.warning(f"Coherence too low ({similarity:.3f}), reverting changes...")
            return original, similarity
        
        return modified, similarity

# Initialize models on startup
@app.on_event("startup")
async def startup_event():
    await initialize_models()

@app.get("/health")
async def health_check():
    return {"status": "healthy", "models_loaded": len(models)}

@app.post("/analyze-patterns")
async def analyze_patterns(request: HumanizationRequest):
    """Analyze user writing patterns"""
    try:
        humanizer = TextHumanizer()
        patterns = await humanizer.analyze_user_patterns(request.text)
        return {"patterns": patterns}
    except Exception as e:
        logger.error(f"Pattern analysis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/humanize-text")
async def humanize_text_endpoint(request: HumanizationRequest):
    """Main humanization endpoint with streaming response"""
    
    async def generate_humanized_text() -> AsyncGenerator[str, None]:
        try:
            humanizer = TextHumanizer()
            
            # Start with original text
            current_text = request.text
            
            # Stream progress updates
            yield f"data: {json.dumps({'type': 'progress', 'step': 'analyzing', 'message': 'Analyzing writing patterns...'})}\n\n"
            
            # Step 1: Analyze patterns if not provided
            if not request.user_patterns:
                user_patterns = await humanizer.analyze_user_patterns(current_text)
            else:
                user_patterns = request.user_patterns
            
            yield f"data: {json.dumps({'type': 'progress', 'step': 'structural', 'message': 'Restructuring sentences...'})}\n\n"
            await asyncio.sleep(0.1)  # Small delay for streaming effect
            
            # Step 2: Structural Humanization
            current_text = await humanizer.structural_humanization(current_text, user_patterns)
            
            yield f"data: {json.dumps({'type': 'progress', 'step': 'vocabulary', 'message': 'Adapting vocabulary...'})}\n\n"
            await asyncio.sleep(0.1)
            
            # Step 3: Vocabulary Adaptation
            current_text = await humanizer.vocabulary_adaptation(current_text, user_patterns)
            
            yield f"data: {json.dumps({'type': 'progress', 'step': 'authenticity', 'message': 'Adding natural imperfections...'})}\n\n"
            await asyncio.sleep(0.1)
            
            # Step 4: Authenticity Injection
            current_text = await humanizer.authenticity_injection(current_text)
            
            yield f"data: {json.dumps({'type': 'progress', 'step': 'voice', 'message': 'Integrating personal voice...'})}\n\n"
            await asyncio.sleep(0.1)
            
            # Step 5: Personal Voice Integration
            current_text = await humanizer.personal_voice_integration(current_text, user_patterns)
            
            yield f"data: {json.dumps({'type': 'progress', 'step': 'coherence', 'message': 'Preserving coherence...'})}\n\n"
            await asyncio.sleep(0.1)
            
            # Step 6: Coherence Preservation
            final_text, similarity_score = await humanizer.coherence_preservation(request.text, current_text)
            
            # Return final result
            yield f"data: {json.dumps({'type': 'complete', 'text': final_text, 'similarity_score': similarity_score, 'user_patterns': user_patterns})}\n\n"
            yield "data: [DONE]\n\n"
            
        except Exception as e:
            logger.error(f"Humanization failed: {e}")
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
    
    return StreamingResponse(
        generate_humanized_text(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
        }
    )

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )