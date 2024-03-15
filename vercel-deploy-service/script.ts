import { exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as mime from 'mime-types';
import Redis from 'ioredis';

const publisher = new Redis('');


const s3Client = new S3Client({
  region: 'ap-south-1',
  credentials: {
      accessKeyId: '',
      secretAccessKey: ''
  }
});

const PROJECT_ID: string | undefined = process.env.PROJECT_ID;

function publishLog(log: string) {
  publisher.publish(`logs:${PROJECT_ID}`, JSON.stringify({ log }));
}

async function init() {
  console.log('Executing script.js');
  publishLog('Build Started...');
  const outDirPath = path.join(__dirname, 'output');

  const p = exec(`cd ${outDirPath} && npm install && npm run build`);

  p.stdout?.on('data', function (data: Buffer) {
      console.log(data.toString());
      publishLog(data.toString());
  });

  p.stderr?.on('data', function (data: Buffer) {
      console.error('Error', data.toString());
      publishLog(`error: ${data.toString()}`);
  });

  p.on('close', async function () {
      console.log('Build Complete');
      publishLog(`Build Complete`);
      const distFolderPath = path.join(__dirname, 'output', 'dist');
      const distFolderContents = fs.readdirSync(distFolderPath, { withFileTypes: true, recursive: true });

      publishLog(`Starting to upload`);
      for (const file of distFolderContents) {
          const filePath = path.join(distFolderPath, file.name);
          if (file.isDirectory()) continue;

          console.log('uploading', filePath);
          publishLog(`uploading ${file.name}`);

          const command = new PutObjectCommand({
              Bucket: 'myvercel-outputs',
              Key: `__outputs/${PROJECT_ID}/${file.name}`,
              Body: fs.createReadStream(filePath),
              ContentType: mime.lookup(filePath) || undefined
          });

          await s3Client.send(command);
          publishLog(`uploaded ${file.name}`);
          console.log('uploaded', filePath);
      }
      publishLog(`Done`);
      console.log('Done...');
  });
}

init();
