from dotenv import load_dotenv
load_dotenv()

from pydantic import BaseModel
from typing import Optional, Dict, Any
import os
from groq import Groq

client = Groq(api_key=os.getenv("GROQ_API_KEY"))


class SummarizeRequest(BaseModel):
    ml_result: Dict[str, Any]
    question: Optional[str] = None


def build_prompt(ml_result: dict, question: Optional[str]):
    base_context = f"""
You are an expert data scientist explaining machine learning
results to a non-technical user.

Task Type: {ml_result.get("task_type")}
Best Model: {ml_result.get("best_model")}
Metrics: {ml_result.get("metrics")}
Top Features: {ml_result.get("explanation", {}).get("top_features")}
Feature Importance: {ml_result.get("explanation", {}).get("feature_importance")}

Instructions:
- Explain in simple clear English
- No technical jargon
- Use bullet points
- Be concise and helpful
"""
    if question:
        return base_context + f"\n\nUser Question: {question}\nAnswer clearly:"
    else:
        return base_context + "\n\nGive a clear summary of these results:"


def generate_summary(ml_result: dict, question: Optional[str] = None):
    prompt = build_prompt(ml_result, question)

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": "You are a helpful data science assistant who explains ML results clearly."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0.3,
        max_tokens=500
    )

    return response.choices[0].message.content