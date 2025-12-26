const { GoogleGenAI, Type } = require("@google/genai");
const fs = require("fs");
const path = require("path");

// ============================
// TOOL FUNCTIONS
// ============================

async function listFiles({ directory }) {
  try {
    const files = [];

    const supportedExtensions = [
      ".cpp",
      ".c",
      ".py",
      ".html",
      ".js",
      ".css",
      ".java",
      ".ts"
    ];

    function scan(dir) {
      const items = fs.readdirSync(dir);

      for (const item of items) {
        const fullPath = path.join(dir, item);

        const banned = ["node_modules", ".git", ".vscode", "build", "dist", "venv"];
        if (banned.some(b => fullPath.includes(path.sep + b + path.sep))) continue;

        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          scan(fullPath);
        } else if (stat.isFile()) {
          const ext = path.extname(item);
          if (supportedExtensions.includes(ext)) files.push(fullPath);
        }
      }
    }

    scan(directory);
    console.log(`Found ${files.length} files`);
    return { files };

  } catch (err) {
    console.error("Error scanning files:", err.message);
    return { files: [], error: err.message };
  }
}

async function readFile({ file_path }) {
  try {
    if (!fs.existsSync(file_path)) throw new Error("File does not exist");

    const content = fs.readFileSync(file_path, "utf-8");
    console.log(`Reading: ${file_path}`);
    return { content };

  } catch (err) {
    console.error("Error reading file:", file_path, err.message);
    return { content: "", error: err.message };
  }
}

async function writeFile({ file_path, content }) {
  try {
    fs.writeFileSync(file_path, content, "utf-8");
    console.log(`Fixed: ${file_path}`);
    return { success: true };

  } catch (err) {
    console.error("Error writing file:", file_path, err.message);
    return { success: false, error: err.message };
  }
}

// ============================
// TOOL REGISTRY
// ============================

const tools = {
  list_files: listFiles,
  read_file: readFile,
  write_file: writeFile
};

// ============================
// TOOL DECLARATIONS
// ============================

const listFilesTool = {
  name: "list_files",
  description: "Get supported files from directory",
  parameters: {
    type: Type.OBJECT,
    properties: {
      directory: { type: Type.STRING }
    },
    required: ["directory"]
  }
};

const readFileTool = {
  name: "read_file",
  description: "Read file content",
  parameters: {
    type: Type.OBJECT,
    properties: {
      file_path: { type: Type.STRING }
    },
    required: ["file_path"]
  }
};

const writeFileTool = {
  name: "write_file",
  description: "Write corrected file code",
  parameters: {
    type: Type.OBJECT,
    properties: {
      file_path: { type: Type.STRING },
      content: { type: Type.STRING }
    },
    required: ["file_path", "content"]
  }
};

// ============================
// MAIN AI AGENT
// ============================

async function runAgent(directoryPath, apiKey) {
  try {
    if (!apiKey || apiKey.trim() === "") {
      throw new Error("Gemini API Key missing");
    }

    const ai = new GoogleGenAI({ apiKey });

    console.log(`\nReviewing: ${directoryPath}`);

    const History = [{
      role: "user",
      parts: [{ text: `Review and fix all supported language files in: ${directoryPath}` }]
    }];

    let finalSummary = "";

    while (true) {
      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: History,
        config: {
          systemInstruction: `
You are a professional code reviewer and fixer.

Supported Languages:
C, C++, Python, JavaScript, TypeScript, HTML, CSS, Java

Rules:
- Identify syntax errors, logic errors, inefficiency, bad structure, naming problems
- Improve readability and maintainability
- Preserve intent of original program
- For HTML/CSS/JS ensure best practices
- For Python ensure clean and readable Pythonic style
- For C/C++/Java ensure correctness and safe coding practices

Steps:
1) Use list_files to get supported files
2) Use read_file to read content
3) Review and FIX real problems
4) Write fixed files back using write_file
5) Produce a human readable summary

Summary Format:

CODE REVIEW COMPLETE

Total Files Analyzed: X
Files Fixed: Y

Then list file names and describe the improvements in each.
`,
          tools: [{
            functionDeclarations: [listFilesTool, readFileTool, writeFileTool]
          }]
        }
      });

      if (result.functionCalls?.length > 0) {
        for (const call of result.functionCalls) {
          const { name, args } = call;

          console.log("Running tool:", name);

          let response;
          try {
            response = await tools[name](args);
          } catch (toolErr) {
            response = { error: toolErr.message };
          }

          History.push({ role: "model", parts: [{ functionCall: call }] });

          History.push({
            role: "user",
            parts: [{
              functionResponse: {
                name,
                response: { result: response }
              }
            }]
          });
        }
      } else {
        finalSummary = result.text;
        console.log("\n" + finalSummary);
        break;
      }
    }

    return finalSummary;

  } catch (err) {
    console.error("Agent crashed:", err.message);
    return "Code Review Failed: " + err.message;
  }
}

module.exports = { runAgent };
