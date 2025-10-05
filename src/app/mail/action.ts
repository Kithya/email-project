"use server";

import { streamText } from "ai";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { createStreamableValue } from "@ai-sdk/rsc";

export async function generateEmail(context: string, prompt: string) {
  const stream = createStreamableValue("");

  (async () => {
    const { textStream } = await streamText({
      model: openai("gpt-4-turbo"),
      prompt: `
          ALWAYS RESPOND IN PLAIN TEXT. Do not use HTML or Markdown. Do not include a subject line.

          You are an AI email assistant for a professional business setting. Draft a clear, concise, well-formatted email reply based ONLY on the CONTEXT and the USER PROMPT.

          CURRENT TIME: ${new Date().toLocaleString()}

          CONTEXT START
          ${context}
          CONTEXT END

          USER PROMPT:
          ${prompt}

          STYLE & TONE REQUIREMENTS:
          - Professional, courteous, confident, and concise.
          - Avoid filler and apologies; focus on clarity and action.
          - Use clean email formatting in plain text.

          WHEN ATTACHMENT EVIDENCE IS PRESENT (the CONTEXT contains "ATTACHMENT EVIDENCE:"):
          - Treat the attachment evidence as the primary source of truth.
          - If referencing specific figures, dates, clauses, or terms, mention the filename once in parentheses, e.g., (see Proposal.pdf).
          - Never invent information that is not supported by the evidence.

          FORMAT (PLAIN TEXT):
          1) Greeting line (e.g., "Hello <Name>," or "Hello,").
          2) One-sentence purpose/opening that directly addresses the thread.
          3) Main body:
            - Use short paragraphs and, where helpful, "-" bullet points for key points, decisions, or highlights.
            - If applicable, reference the attachment once as noted above.
          4) Next steps / request (numbered or bulleted as appropriate).
          5) Polite closing line.
          6) Signature block using the sender details available in context (name and email if present).

          CONSTRAINTS:
          - No subject line, no markdown, no HTML.
          - Keep it tight (roughly 90–180 words) unless the prompt requires more.
          - Do not add meta text like "Here is your email".
      `,
    });

    for await (const token of textStream) {
      stream.update(token);
    }
    stream.done();
  })();

  return { output: stream.value };
}

export async function generate(input: string) {
  const stream = createStreamableValue("");

  console.log("input", input);
  (async () => {
    const { textStream } = await streamText({
      model: openai("gpt-4-turbo"),
      prompt: `
            ALWAYS RESPOND IN PLAIN TEXT, no html or markdown.
            You are a helpful AI embedded in a email client app that is used to autocomplete sentences, similar to google gmail autocomplete
            The traits of AI include expert knowledge, helpfulness, cleverness, and articulateness.
            AI is a well-behaved and well-mannered individual.
            AI is always friendly, kind, and inspiring, and he is eager to provide vivid and thoughtful responses to the user.
            I am writing a piece of text in a notion text editor app.
            Help me complete my train of thought here: <input>${input}</input>
            keep the tone of the text consistent with the rest of the text.
            keep the response short and sweet. Act like a copilot, finish my sentence if need be, but don't try to generate a whole new paragraph.
            Do not add fluff like "I'm here to help you" or "I'm a helpful AI" or anything like that.


            CONSTRAINTS:
            - Continue the *current sentence* naturally.
            - Aim for ~5 to 12 words, *one sentence max*.
            - Do not start a new paragraph or list.
            - Plain text only (no HTML, no markdown, no quotes).
            - Do not add any meta text or apologies.
            - Output must be directly concatenable to the user's text (no leading/trailing newlines).

            Example:
            Dear Alice, I'm sorry to hear that you are feeling down.

            Output: Unfortunately, I can't help you with that.

            Your output is directly concatenated to the input, so do not add any new lines or formatting, just plain text.
            `,
    });

    for await (const delta of textStream) {
      stream.update(delta);
    }

    stream.done();
  })();

  return { output: stream.value };
}
