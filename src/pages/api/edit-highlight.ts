// --- PATCH 3: pages/api/edit-highlight.ts ---
import { NextApiRequest, NextApiResponse } from 'next';
import { editHighlightedText } from '@/lib/claude';
import { readFileSync } from 'fs';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { original, prompt, fullReport } = req.body;
  console.log("[edit-highlight] Received prompt:", prompt);
  console.log("[edit-highlight] Received original text:", original);


  if (!original || !prompt) return res.status(400).json({ error: 'Missing fields' });

  try {
    const result = await editHighlightedText(prompt, original, fullReport); // ⬅️ remove rubric arg
    console.log("[edit-highlight] Claude response:", result.editedText);
    return res.status(200).json(result);
  } catch (err) {
    console.error('Claude edit error:', err);
    return res.status(500).json({ error: 'Claude failed to edit' });
  }
}
