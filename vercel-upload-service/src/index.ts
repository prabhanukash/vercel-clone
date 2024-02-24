import express from "express";
import cors from "cors";
import simpleGit from "simple-git";
import { generate } from "./utils"
import path from "path";
import { getAllFiles } from "./files";
import { uploadFile } from "./aws"
import { createClient } from "redis"

const publisher = createClient();
publisher.connect()

const subscriber = createClient();
subscriber.connect();

const app = express();
app.use(cors());
app.use(express.json())

app.post("/deploy", async (req, res) => {
  const repoUrl = req.body.repoUrl;
  console.log(repoUrl);
  const id = generate();
  await simpleGit().clone(repoUrl, path.join(__dirname,`output/${id}`))
  
  const files = getAllFiles(path.join(__dirname, `output/${id}`))
  files.forEach(async file => {
    let fileName = path.normalize(path.relative(__dirname, file));
    fileName = fileName.split(path.sep).join('/');
    await uploadFile(fileName, file)
  })
  await new Promise((resolve) => setTimeout(resolve, 5000))
  publisher.lPush("build_queue",id);
  res.json({
    id: id,
  })
  publisher.hSet("status", id, "uploaded");
})

app.get("/status", async (req, res) => {
  const id = req.query.id;
  const response = await subscriber.hGet("status", id as string);
  res.json({
    status: response
  })
})

app.listen(3000);
