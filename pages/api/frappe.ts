import axios from 'axios';
import {
  Project,
  PropertySignature,
} from 'ts-morph';


// Replace with your Frappe server's URL and API key/secret




// Helper function to handle nested interfaces
async function processNestedInterface(type: string, basePath: string): Promise<string | null> {
  const project = new Project();
  const sourceFile = project.addSourceFileAtPath(basePath);
  const interfaceDeclaration = sourceFile.getInterface(type);

  if (!interfaceDeclaration) {
    console.warn(`Interface ${type} not found in ${basePath}`);
    return null;
  }

  await createFrappeDoctypeFromTypeScriptInterface(basePath, type);
  return type;
}

// Function to create Frappe DocType from TypeScript interface
async function createFrappeDoctypeFromTypeScriptInterface(interfacePath: string, interfaceName: string) {
  const project = new Project();
  const sourceFile = project.addSourceFileAtPath(interfacePath);
  const interfaceDeclaration = sourceFile.getInterface(interfaceName);

  if (!interfaceDeclaration) {
    throw new Error(`Interface ${interfaceName} not found in ${interfacePath}`);
  }

  const doctypeFields = [];

  for (const property of interfaceDeclaration.getProperties()) {
    const type = property.getType().getText();

    if (property.getType().isInterface()) {
      const nestedInterfaceName = await processNestedInterface(type, interfacePath);
      if (nestedInterfaceName) {
        doctypeFields.push({
          fieldname: property.getName(),
          label: property.getName(),
          fieldtype: 'Link',
          reqd: PropertySignature(property) && property.hasQuestionToken() ? 0 : 1,
          options: nestedInterfaceName,
        });
      }
    } else {
      doctypeFields.push({
        fieldname: property.getName(),
        label: property.getName(),
        fieldtype: getTypeScriptTypeToFieldtype(type),
        reqd: PropertySignature(property) && property.hasQuestionToken() ? 0 : 1,
      });
    }
  }

//   // Define the payload for creating a Frappe DocType
//   const payload = {
//     doctype: 'DocType',
//     name: interfaceName,
//     module: 'Your Module', // Replace with the desired module
//     istable: 0, // Set to 1 if the DocType is a child table
//     fields: doctypeFields,
//   };

//   try {
//     // Send a request to create the DocType
//     const response = await axios.post(`${FRAPPE_BASE_URL}/api/resource/DocType`, payload, {
//       headers: {
//         'Authorization': `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`,
//         'Content-Type': 'application/json',
//       },
//     });

//     console.log(`DocType created: ${response.data.data.name}`);
//   } catch (error) {
//     if (error.response && error.response.data && error.response.data.exc_type === 'NameError') {
//       console.warn(`DocType ${interfaceName