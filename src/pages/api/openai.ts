import { DEFAULT_OPENAI_MODEL } from "@/shared/Constants";
import { OpenAIModel } from "@/types/Model";
import * as dotenv from "dotenv";
import { NextApiRequest, NextApiResponse } from "next";
import { ChatCompletionRequestMessage} from "openai";
import { HeliconeProxyConfiguration as Configuration, HeliconeProxyOpenAIApi as OpenAIApi } from "helicone";


// import rateLimit from 'express-rate-limit'
// import slowDown from 'express-slow-down'


// Get your environment variables
dotenv.config();

// OpenAI configuration creation
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
  heliconeMeta: {
    apiKey: process.env.HELICONE_API_KEY,
  },
});


// OpenAI instance creation
const openai = new OpenAIApi(configuration);

// const getIP = request =>
//   request.ip ||
//   request.headers['x-forwarded-for'] ||
//   request.headers['x-real-ip'] ||
//   request.connection.remoteAddress

//   export const getRateLimitMiddlewares = ({
//     limit = 10,
//     windowMs = 60 * 1000,
//     delayAfter = Math.round(10 / 2),
//     delayMs = 500,
//   } = {}) => [
//     slowDown({ keyGenerator: getIP, windowMs, delayAfter, delayMs }),
//     rateLimit({ keyGenerator: getIP, windowMs, max: limit }),
//   ]

//   const middlewares = getRateLimitMiddlewares()


//   async function applyRateLimit(request, response) {
//     await Promise.all(
//       middlewares
//         .map(applyMiddleware)
//         .map(middleware => middleware(request, response))
//     )
//   }

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const body = req.body;
  const messages = (body?.messages || []) as ChatCompletionRequestMessage[];
  const model = (body?.model || DEFAULT_OPENAI_MODEL) as OpenAIModel;
  const systemPrompt = body?.systemPrompt || "Respond like you normally would.";

  try {
    const promptMessage: ChatCompletionRequestMessage = {
      role: "system",
      content: systemPrompt,
    };
    const initialMessages: ChatCompletionRequestMessage[] = messages.splice(
      0,
      3
    );
    const latestMessages: ChatCompletionRequestMessage[] = messages
      .slice(-5)
      .map((message) => ({
        role: message.role,
        content: message.content,
      }));

    const completion = await openai.createChatCompletion({
      model: model.id,
      temperature: 0.5,
      messages: [promptMessage, ...initialMessages, ...latestMessages],
    });

    const responseMessage = completion.data.choices[0]?.message?.content?.trim() || "Ruh-oh, there might be an issue with OpenAI...or Shreyas made a mistake which is highly possible. Just text or email Shreyas and he'll fix it ASAP!";


    if (!responseMessage) {
      res
        .status(400)
        .json({ error: "Ruh-oh, there might be an issue with OpenAI. Try again....or Shreyas made a mistake which is highly possible. Just text or email Shreyas and he'll fix it ASAP!" });
    }

    res.status(200).json({ message: responseMessage });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "An error occurred during ping to OpenAI. Please try again.",
    });
  }
}