const { GoogleGenAI, Type } = require("@google/genai");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: __dirname + "/.env" });



// npm i fs
//  npm i path

const ai = new GoogleGenAI({});

// ============================================
// TOOL FUNCTIONS
// ============================================

async function listFiles({ directory }) {
  const files = [];
  const extensions = ['.cpp'];
  
  function scan(dir) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      
      // Skip node_modules, dist, build
      if (fullPath.includes('vscode') || 
          fullPath.includes('venv') || 
          fullPath.includes('git')) continue;
      
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        scan(fullPath);
      } else if (stat.isFile()) {
        const ext = path.extname(item);
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  }
  
  scan(directory);
  console.log(`Found ${files.length} files`);
  return { files };
}


async function readFile({ file_path }) {
  const content = fs.readFileSync(file_path, 'utf-8');
  console.log(`Reading: ${file_path}`);
  return { content };
}

async function writeFile({ file_path, content }) {
  fs.writeFileSync(file_path, content, 'utf-8');
  console.log(`✍️  Fixed: ${file_path}`);
  return { success: true };
}

// ============================================
// TOOL REGISTRY
// ============================================

const tools = {
  'list_files': listFiles,
  'read_file': readFile,
  'write_file': writeFile
};

// ============================================
// TOOL DECLARATIONS
// ============================================

const listFilesTool = {
  name: "list_files",
  description: "Get all C++ files in a directory",
  parameters: {
    type: Type.OBJECT,
    properties: {
      directory: {
        type: Type.STRING,
        description: "Directory path to scan"
      }
    },
    required: ["directory"]
  }
};

const readFileTool = {
  name: "read_file",
  description: "Read a file's content",
  parameters: {
    type: Type.OBJECT,
    properties: {
      file_path: {
        type: Type.STRING,
        description: "Path to the file"
      }
    },
    required: ["file_path"]
  }
};

const writeFileTool = {
  name: "write_file",
  description: "Write fixed content back to a file",
  parameters: {
    type: Type.OBJECT,
    properties: {
      file_path: {
        type: Type.STRING,
        description: "Path to the file to write"
      },
      content: {
        type: Type.STRING,
        description: "The fixed/corrected content"
      }
    },
    required: ["file_path", "content"]
  }
};

// ============================================
// MAIN FUNCTION
// ============================================

async function runAgent(directoryPath) {
  console.log(`🔍 Reviewing: ${directoryPath}\n`);

  const History = [{
    role: 'user',
    parts: [{ text: `Review and fix all C++ code in: ${directoryPath}` }]
  }];
  
  let finalSummary = "";

  while (true) {
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: History,
      config: {
        systemInstruction: `Your Job : you are a code reviewer for my cpp files and fixer

STEPS you will follow:
1. Use list_files to get only the c++ files from the directory and nothing else.
2.You will use the read_file tool to read the c++ code from the files
3.Now crucial step in this step you will analyze the each files codes
C++ Issues:
Now you will find all the bugs in the code in the files 
And if you find the it you will fix it.
Fix any errors, syntax errors, Wrong code, bad naming,
wrong concept behind it , fix the spaces , make the code right 
which can run properly and give satisfying results according to the goals.
Make the code look more professional.

4. Use write_file to FIX the issues you found (write corrected code back)
5. After fixing all files, respond with a summary report in TEXT format

**Summary Report Format:**
📊 CODE REVIEW COMPLETE

Total Files Analyzed: X
Files Fixed: Y

And after that you will give me the files you fixed with what different things you fixed in that files
and will give improvements you have done.

Be practical and focus on real issues. Actually FIX the code, don't just report.`,
        tools: [{
          functionDeclarations: [listFilesTool, readFileTool, writeFileTool]
        }]
      }
    });

    // Process ALL function calls at once
    if (result.functionCalls?.length > 0) {
      
      // Execute all function calls
      for (const functionCall of result.functionCalls) {
        const { name, args } = functionCall;
        
        console.log(`📌 ${name}`);
        const toolResponse = await tools[name](args);

        // Add function call to history
        History.push({
          role: "model",
          parts: [{ functionCall }]
        });

        // Add function response to history
        History.push({
          role: "user",
          parts: [{
            functionResponse: {
              name,
              response: { result: toolResponse }
            }
          }]
        });
      }
      
    } else {
      console.log('\n' + result.text);
      finalSummary = result.text;
      break;
    }
  }


  return finalSummary;

}
module.exports = { runAgent };

// node vss.js ../DS

// const directory = process.argv[2] || '.';

// await runAgent(directory);