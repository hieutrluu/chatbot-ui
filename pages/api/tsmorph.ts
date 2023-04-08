import { Project, PropertySignature } from 'ts-morph';

// function isRequiredProperty(propertySignature: PropertySignature): boolean {
//   const isOptional = (propertySignature.getQuestionTokenNode() !== undefined);
//   const hasInitializer = (propertySignature.getInitializer() !== undefined);
//   return !isOptional && !hasInitializer;
// }
import { FrappeApp } from 'frappe-js-sdk';
const FRAPPE_BASE_URL = 'http://vector.localhost:8000';
const API_KEY = '9b60b6f9d13b863';
const API_SECRET = 'd6a6a5999c7a794';

async function createDocType(doctypeName: any, moduleName: any, fields:any) {
  const response = await fetch(`${FRAPPE_BASE_URL}/api/resource/DocType`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `token ${API_KEY}:${API_SECRET}`,
    },
    body: JSON.stringify({
      data: JSON.stringify({
        doctype: "DocType",
        // name: doctypeName,
        module: moduleName,
        fields: fields.map((field: any) => ({
          fieldname: field.fieldname,
          fieldtype: field.fieldtype,
          label: field.label,
          reqd: field.reqd || false,
          options: field.options || "",
        })),
      }),
    }),
  });

  if (response.ok) {
    const data = await response.json();
    console.log(`Doctype ${doctypeName} created successfully in the ${moduleName} module.`);
  } else {
    console.error(`Error creating Doctype ${doctypeName} in the ${moduleName} module:`, await response.text());
  }
}

//Add your Frappe backend's URL
const frappe = new FrappeApp(FRAPPE_BASE_URL, {
  useToken: true,
  token: () => `${API_KEY}:${API_SECRET}`,
  type: 'token', // use "bearer" in case of oauth token
});
const db = frappe.db();

function isDoctypeExist(prop: PropertySignature): boolean {
  const type = prop.getType().getText();
  console.log('type', type);
  // db.getDoc('Docype', type)
  //   .then((res) => {
  //     console.log(res);
  //     // return false;
  //   })
  //   .catch((err) => {
  //     console.log(err);
  //     // return false;
  //   })
  //   .finally(() => {
  //     // return false;
  //   });
  return false;
  // const isDoctype = type.includes("Doctype");
  // return isDoctype;
}

function createDocFieldFromProperty(prop: PropertySignature): any {
  const type = prop.getType().getText();
  let docfield_type = getTypeScriptTypeToFieldtype(type);
  let docfield = {
    fieldname: prop.getName(),
    label: prop.getName().toLowerCase(),
    fieldtype: docfield_type,
    reqd: prop.hasQuestionToken() ? 0 : 1,
    options: "",
  }
  if (docfield_type === 'Link'){
    docfield['options'] = type.split('.')[1];
  } else if (docfield_type === 'Table') {
    let childtable_doctype = isListProp(prop);
    if (childtable_doctype){
      docfield['options'] = childtable_doctype.split('.')[1].split('[]')[0];
    }
  }
  return docfield;
}


function isListProp(input: PropertySignature | string): string | null {
  if (typeof input === 'string'){
    var type = input;
  } else {
    var type = input.getType().getText();
  }
  // const type = prop.getType().getText();
  const isList = type.includes('[]') || type.includes('Array<');
  if(isList){
    let type_elts = type.split('|').map(t => t.trim())
      return type_elts.filter(t => t.includes('[]'))[0]
  } else{
    return null
  }
}

// Function to convert TypeScript type to Frappe fieldtype
function getTypeScriptTypeToFieldtype(type: string): string {
  switch (type) {
    case 'string':
    	return 'Data';
    case 'number':
    	return 'Float';
    case 'integer':
      return 'Int'
    case 'boolean':
    	return 'Check';
    case 'Date':
    	return 'Date';
    default:
      // check for Link, Table, Table Multiselect
      // return 'Link';
      if (isListProp(type)){
        return 'Table';
      }else{
        return 'Link';
      }
  }
}

function isPrimitive(prop: PropertySignature): boolean {
  const primitiveTypes = ['number', 'string', 'boolean', 'undefined', 'null'];
  const type = prop.getType().getText();
  const isPrimitive = primitiveTypes.includes(type);
  return isPrimitive;
}

const project = new Project({
  tsConfigFilePath: '/Users/luuhieu/htl-code/chatbot-ui/tsconfig.json',
});

let srcFiles = project.addSourceFilesAtPaths(
  '/Users/luuhieu/htl-code/chatbot-ui/types/*{.d.ts,.ts}',
);
let interfaces = srcFiles[0].getInterfaces();
interfaces.forEach((iface) => {
  if (iface.getName() === 'Conversation'){
    console.log(iface.getName());
    let properties = iface.getProperties();
    let docfields = properties.map(prop => createDocFieldFromProperty(prop));
    console.log(docfields)
    // frappe.call().post('frappe_prompt.frappe_prompt.doctype.module.utils.my_function', {"data": {"test": "test"}}
    frappe.call().post('frappe_prompt.api.utils.create_doctype', {"data": {"doctype_name": iface.getName(), "module": "Frappe Prompt", "fields": docfields}}
    ).then((result) => console.log(result)).catch((error) => console.error(error));
    // createDocType('Conversation', 'Frappe Prompt', properties.map(prop => createDocFieldFromProperty(prop)));
    // db.createDoc('DocType',{
    //     __newname: 'Conversation',
    //     module: 'Frappe Prompt',
    //     fields: properties.map(prop => createDocFieldFromProperty(prop))
    // }).then((res) => {
    //   console.log(res);
    // }).catch(err => console.error(err)).finally(() => console.log('done'));
  }
  // properties.forEach((property) => {
  //   console.log(property.getName());
  //   console.log(property.getType().getText());
    // if (property.getType().isArray()){
    //   console.log(property.getType().getText());
    // }
    // console.log(property.getType().isArray())
    // if(isPrimitive(property)){

    // }else{
    //   // parse interface type

    //   property.getType().isArray();
    //   console.log(isDoctypeExist(property));

    // }
    // console.log(property.getType().getText().split('|').map(t => t.trim()));
    // console.log(property.getQuestionTokenNode());
    // console.log(property.getInitializer());
    // console.log(isRequiredProperty(property));
    // console.log(property.isRequired());
  // });
  // console.log();
});
// project.addSourceFilesAtPaths(["folder/file.ts", "folder/otherFile.ts"]);
// project.addSourceFilesAtPaths(["**/*.ts", "!**/*.d.ts"]);
// const interfaceDeclaration = project.get
