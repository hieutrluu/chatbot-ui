import { Project } from "ts-morph";

const project = new Project({
  tsConfigFilePath: "/Users/luuhieu/htl-code/chatbot-ui/tsconfig.json",
});

project.addSourceFilesAtPaths("/Users/luuhieu/htl-code/chatbot-ui/types/*{.d.ts,.ts}");
// project.addSourceFilesAtPaths(["folder/file.ts", "folder/otherFile.ts"]);
// project.addSourceFilesAtPaths(["**/*.ts", "!**/*.d.ts"]);