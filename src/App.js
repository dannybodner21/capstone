import React, { useCallback, useState, useEffect } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import CustomEntityNode from './CustomEntityNode';
import './App.css';
import yaml from "js-yaml";

const nodeTypes = {
  entity: (props) => (
    <CustomEntityNode
      {...props}
      setNodes={props.setNodes}
      onAddProperty={props.onAddProperty}
      onDeleteProperty={props.onDeleteProperty}
    />
  ),
};

const initialNodes = [];
const initialEdges = [];

export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [entityLabel, setEntityLabel] = useState("");
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [isExportPopupVisible, setIsExportPopupVisible] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [propertyText, setPropertyText] = useState("");
  const [propertyType, setPropertyType] = useState("String");
  const [propertyDescription, setPropertyDescription] = useState("");
  const [propertyExample, setPropertyExample] = useState("");
  const [isArray, setIsArray] = useState(false);
  const [editingPropertyIndex, setEditingPropertyIndex] = useState(null);
  const [isEnum, setIsEnum] = useState(false);
  const [enumValues, setEnumValues] = useState("");
  const [paths, setPaths] = useState([]);
  const [newPath, setNewPath] = useState("");
  const [isEntitySectionOpen, setIsEntitySectionOpen] = useState(false);
  const [isPathsSectionOpen, setIsPathsSectionOpen] = useState(false);
  const [expandedPathIndex, setExpandedPathIndex] = useState(null);
  const [httpMethod, setHttpMethod] = useState("GET");
  const [pathSummary, setPathSummary] = useState("");
  const [pathDescription, setPathDescription] = useState("");
  const [operationId, setOperationId] = useState("");
  const [pathTag, setPathTag] = useState("");
  const [pathParameters, setPathParameters] = useState([]);
  const [isPathPopupVisible, setIsPathPopupVisible] = useState(false);
  const [exportData, setExportData] = useState("");
  const [isImportPopupVisible, setIsImportPopupVisible] = useState(false);
  const [importData, setImportData] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openAPIMetadata, setOpenAPIMetadata] = useState({
    title: "Sample API Title",
    version: "3.0.0",
    description: "Optional multiline or single-line description.",
    license: "",
    authors: "",
    externalDocs: "",
    servers: [{ url: "https://api.example.com/v1", description: "Production Server" }],
  });
  const [isMetadataOpen, setIsMetadataOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState("json"); // Default to JSON


  // get the entity name for properties popup
  const selectedEntity = nodes.find((node) => node.id === selectedNodeId);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  // accordion stuff for the side bar
  const toggleEntitySection = () => {
    setIsEntitySectionOpen(!isEntitySectionOpen);
  };

  const togglePathsSection = () => {
    setIsPathsSectionOpen(!isPathsSectionOpen);
  };

  // generate OpenAPI report
  const generateOpenAPI = () => {
    if (nodes.length === 0) return "No data to export.";

    // create base OpenAPI schema
    const schema = {
      openapi: "3.1.0",
      info: {
        title: openAPIMetadata.title,
        version: openAPIMetadata.version,
        description: openAPIMetadata.description,
        license: openAPIMetadata.license ? { name: openAPIMetadata.license } : undefined,
        contact: openAPIMetadata.authors ? { name: openAPIMetadata.authors } : undefined,
      },
      externalDocs: openAPIMetadata.externalDocs ? { url: openAPIMetadata.externalDocs } : undefined,
      servers: openAPIMetadata.servers,
      security: [
        { ApiKeyAuth: [] }
      ],
      paths: {},
      components: {
        securitySchemes: {
          ApiKeyAuth: {
            type: "apiKey",
            in: "header",
            name: "Authorization",
          },
        },
        schemas: {},
      },
      nodePositions: {},
    };

    // create paths
    paths.forEach((path) => {

      const method = path.method.toLowerCase();

      // create the path if it doesn't exist
      if (!schema.paths[path.path]) {
        schema.paths[path.path] = {};
      }

      schema.paths[path.path][method] = {
        summary: path.summary || "No summary",
        description: path.description || "No description",
        operationId: path.operationId || `operation_${method}_${path.path.replace(/\W/g, '_')}`,
        tags: path.tag ? [path.tag] : [],
        parameters: [],
        responses: {
          "200": {
            description: "Successful response",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {},
                },
              },
            },
          },
          "400": { description: "Bad request" },
          "401": { description: "Unauthorized" },
          "404": { description: "User not found" },
          "500": { description: "Internal server error" },
        },
      };

      // if there are parameters, add them as an array
      if (path.parameters && path.parameters.length > 0) {
        schema.paths[path.path][method].parameters = path.parameters.map((param) => ({
            name: param.name,
            in: param.in || "query",
            required: param.required || false,
            schema: {
              type: param.type || "string",
            },
            ...(param.description ? { description: param.description } : {}),
        }));
      }

    });

    // create entities
    nodes.forEach((node) => {

      let propertyDefinition;
      const entityLabel = node.data.label;

      // save the node's screen positioning
      schema.nodePositions[entityLabel] = {
        x: node.position.x,
        y: node.position.y
      };

      // create an object for each entity
      schema.components.schemas[entityLabel] = {
        type: "object",
        properties: {},
      };

      if (node.data.properties && node.data.properties.length > 0) {
        node.data.properties.forEach((prop) => {

          // make sure object exists
          if (!schema.components.schemas[entityLabel].properties) {
            schema.components.schemas[entityLabel].properties = {};
          }

          // if property is a reference to a user object, store as reference
          if (typeof prop.type === "object" && prop.type.$ref) {

            propertyDefinition = { $ref: prop.type.$ref };

          } else if (typeof prop.type === "object" && prop.type.type === "array") {

            // if it's an array, format it properly
            propertyDefinition = {
              type: "array",
              items: prop.type.items.$ref
                ? { $ref: prop.type.items.$ref }
                : { type: prop.type.items.type },
            };

          } else if (typeof prop.type === "string") {

            // primitive types
            propertyDefinition = { type: prop.type.toLowerCase() };

          } else {

            // default value is string
            propertyDefinition = { type: "string" };

          }

          // add in any optional fields
          if (prop.enum) propertyDefinition.enum = prop.enum;
          if (prop.description) propertyDefinition.description = prop.description;
          if (prop.example) propertyDefinition.example = prop.example;

          // assign the propery to the given object schema
          schema.components.schemas[entityLabel].properties[prop.name] = propertyDefinition;

        });
      }
    });

    // return either YAML or JSON report
    return exportFormat === "yaml" ? yaml.dump(schema) : JSON.stringify(schema, null, 2);
    //return JSON.stringify(schema, null, 2);
  };

  // show export popup
  const showExportPopup = () => {
    setIsMenuOpen(false);
    const apiSchema = generateOpenAPI(exportFormat);
    setExportData(apiSchema);
    setIsExportPopupVisible(true);
  };

  // close export popup
  const closeExportPopup = () => {
    setIsExportPopupVisible(false);
  };

  // add path parameter
  const addParameter = () => {
    setPathParameters([
      ...pathParameters,
      { name: "", in: "path", type: "string", required: false, description: "" },
    ]);
  };

  // delete a path parameter
  const removeParameter = (index) => {
    setPathParameters((prevParams) => prevParams.filter((_, i) => i !== index));
  };

  // update path parameter
  const updateParameter = (index, key, value) => {
    setPathParameters((prevParams) =>
      prevParams.map((param, i) =>
        i === index ? { ...param, [key]: value } : param
      )
    );
  };

  // accordion style for the paths section
  const togglePathDetails = (index) => {
    setExpandedPathIndex(expandedPathIndex === index ? null : index);
  };

  // add an API path
  const addPath = () => {
    if (newPath.trim() === "") return;

    setPaths((prevPaths) => [
      ...prevPaths,
      { path: newPath,
        method: httpMethod,
        summary: pathSummary,
        description: pathDescription,
        operationId: operationId,
        tag: pathTag,
        parameters: pathParameters,
      },
    ]);

    setNewPath("");
    setHttpMethod("GET");
    setPathSummary("");
    setPathDescription("");
    setOperationId("");
    setPathTag("");
    setPathParameters([]);
    setIsPathPopupVisible(false);
  };

  // manually delete a path
  const deletePath = (index) => {
    setPaths((prevPaths) => prevPaths.filter((_, i) => i !== index));
  };

  // show property popup
  const toggleSidebar = (nodeId) => {

    setSelectedNodeId(nodeId);

    // reset fields
    setPropertyText("");
    setPropertyType("String");
    setPropertyDescription("");
    setPropertyExample("");
    setEnumValues("");
    setIsEnum(false);
    setIsArray(false);
    setEditingPropertyIndex(null);

    // show popup
    setIsSidebarVisible(true);
  };

  // close property popup
  const closeSidebar = () => {
    setIsSidebarVisible(false);
    setSelectedNodeId(null);
  };

  // add property to an entity
  const addPropertyToNode = () => {
    if (!selectedNodeId || propertyText.trim() === "") return;

    // check if the selected type is a reference to a user defined object
    const isCustomType = nodes.some((n) => n.data.label === propertyType);
    const referencedNode = nodes.find((n) => n.data.label === propertyType);
    const currentNode = nodes.find((n) => n.id === selectedNodeId);

    // make sure enum values are formatted properly
    let formattedEnum = null;
    if (isEnum) {
      formattedEnum = enumValues
        .split(",")
        .map((val) => val.trim())
        .filter((val) => val.length > 0);
    }

    // if "isArray" is checked, wrap type inside an "items" field
    let propertyTypeDefinition = isCustomType
      ? { $ref: `#/components/schemas/${propertyType}` }
      : propertyType;

    if (isArray) {
      propertyTypeDefinition = {
        type: "array",
        items: isCustomType
          ? { $ref: `#/components/schemas/${propertyType}` }
          : { type: propertyType },
      };
    }

    setNodes((prevNodes) =>
    prevNodes.map((node) =>
      node.id === selectedNodeId
        ? {
            ...node,
            data: {
              ...node.data,
              properties: editingPropertyIndex !== null
                ? node.data.properties.map((prop, index) =>
                    index === editingPropertyIndex
                      ? {
                          name: propertyText,
                          type: propertyTypeDefinition,
                          description: propertyDescription,
                          example: propertyExample,
                          enum: formattedEnum && formattedEnum.length > 0 ? formattedEnum : undefined,
                        }
                      : prop
                  )
                : [
                    ...(node.data.properties || []),
                    {
                      name: propertyText,
                      type: propertyTypeDefinition,
                      description: propertyDescription,
                      example: propertyExample,
                      enum: formattedEnum && formattedEnum.length > 0 ? formattedEnum : undefined,
                    },
                  ],
            },
          }
        : node
    )
  );

  // if editing, remove the old edge in case it was changed
  if (editingPropertyIndex !== null) {
    setEdges((prevEdges) =>
      prevEdges.filter(
        (edge) => !(
          edge.source === selectedNodeId &&
          edge.label === currentNode.data.properties[editingPropertyIndex]?.name
        )
      )
    );
  }

  // if the property is a reference to another object, connect them
  if (referencedNode) {
    setEdges((prevEdges) => [
      ...prevEdges,
      {
        id: `edge-${selectedNodeId}-${referencedNode.id}`,
        source: selectedNodeId,
        target: referencedNode.id,
        type: "smoothstep",
        animated: false,
        label: propertyText,
        style: { stroke: "#888", strokeWidth: 2 },
      },
    ]);
  }

  // clear inputs
  setPropertyText("");
  setPropertyType("String");
  setPropertyDescription("");
  setPropertyExample("");
  setEnumValues("");
  setIsEnum(false);
  setEditingPropertyIndex(null);

  // close popup
  closeSidebar();
};


  // edit a property function
  const editProperty = (nodeId, propertyIndex) => {

    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    const property = node.data.properties[propertyIndex];
      if (!property) {
      console.log("⚠️ Property not found! Check if propertyIndex is correct.");
      return;
    }

    console.log("Editing property:", property);

    let extractedType = "string";
    let isArrayType = false;

    if (typeof property.type === "object") {
      if (property.type.type === "array") {

        // if it's an array, get the type
        isArrayType = true;
        extractedType = property.type.items.$ref
          ? property.type.items.$ref.replace("#/components/schemas/", "")
          : property.type.items.type;

      } else if (property.type.$ref) {

        // if it's a reference, get the object schema name
        extractedType = property.type.$ref.replace("#/components/schemas/", "");

      } else {

        // default to a string
        extractedType = "string";
      }
    }

    setSelectedNodeId(nodeId);
    setPropertyText(property.name);
    setPropertyType(extractedType);
    setPropertyDescription(property.description || "");
    setPropertyExample(property.example || "");
    setEnumValues(property.enum ? property.enum.join(", ") : "");
    setIsEnum(property.enum ? true : false);
    setIsArray(isArrayType);
    setEditingPropertyIndex(propertyIndex);
    setIsSidebarVisible(true);
  };


  // delete property function
  const deleteProperty = (nodeId, propertyIndex) => {
    setNodes((prevNodes) =>
      prevNodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                properties: node.data.properties.filter((_, index) => index !== propertyIndex),
              },
            }
          : node
      )
    );

    // find the property that was deleted
    const deletedProperty = nodes.find((node) => node.id === nodeId)?.data?.properties[propertyIndex];

    // if the deleted property was a reference to another object, remove the connection line
    if (deletedProperty && typeof deletedProperty.type === "object" && deletedProperty.type.$ref) {
      const referencedNodeLabel = deletedProperty.type.$ref.replace("#/components/schemas/", "");
      const referencedNode = nodes.find((n) => n.data.label === referencedNodeLabel);

      if (referencedNode) {
        setEdges((prevEdges) =>
          prevEdges.filter(
            (edge) => !(edge.source === nodeId && edge.target === referencedNode.id)
          )
        );
      }
    }
  };

  // function to capitalize first letter of entity names
  const toPascalCase = (str) =>
    str.charAt(0).toUpperCase() + str.slice(1);

  // add entity function
  const addEntityNode = () => {
    const newId = `node-${nodes.length + 1}`;
    const label = entityLabel.trim()
      ? toPascalCase(entityLabel.trim())
      : `Entity${nodes.length + 1}`;

    const newNode = {
      id: newId,
      type: "entity",
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: { label },
    };

    setNodes((nds) => [...nds, newNode]);
    setEntityLabel("");
    setIsMenuOpen(false);
  };


  // import OpenAPI JSON function ------------------------------------
  const [importedNodes, setImportedNodes] = useState([]);
  const [importedEdges, setImportedEdges] = useState([]);

  const importOpenAPI = () => {
    try {

      const isYAML = importData.trim().startsWith("openapi:");
      const schema = isYAML ? yaml.load(importData) : JSON.parse(importData);

      //const schema = JSON.parse(importData);

      // validate OpenAPI description
      if (!schema.openapi || !schema.info || !schema.components?.schemas) {
        alert("Invalid OpenAPI schema.");
        return;
      }

      setOpenAPIMetadata({
        title: schema.info.title || "Untitled API",
        version: schema.info.version || "1.0.0",
        description: schema.info.description || "",
        license: schema.info.license?.name || "",
        authors: schema.info.contact?.name || "",
        externalDocs: schema.externalDocs?.url || "",
        servers: schema.servers || [{ url: "", description: "" }],
      });

      // create object nodes
      const nodes = Object.entries(schema.components.schemas).map(([schemaName, schemaData], index) => ({
        id: `node-${index + 1}`,
        type: "entity",
        position: schema.nodePositions?.[schemaName] || { x: Math.random() * 400, y: Math.random() * 400 },
        data: {
          label: schemaName,
          properties: schemaData.properties
            ? Object.entries(schemaData.properties).map(([propName, propData]) => ({
                name: propName,
                type: propData.$ref ? { $ref: propData.$ref } : propData.type || "string",
                description: propData.description || "",
              }))
            : [],
        },
      }));

      // paths
      const importedPaths = Object.entries(schema.paths).flatMap(([pathKey, methodsObj]) =>
        Object.entries(methodsObj).map(([method, details]) => ({
          path: pathKey,
          method: method.toUpperCase(),
          summary: details.summary || "",
          description: details.description || "",
          operationId: details.operationId || "",
          tag: (details.tags && details.tags[0]) || "",
          parameters: details.parameters || [],
        }))
      );

      // store paths
      setPaths(importedPaths);

      // store nodes
      setImportedNodes(nodes);
      // add nodes to ReactFlow
      setNodes(nodes);

      // clear input and close import popup
      setImportData("");
      setIsImportPopupVisible(false);

    } catch (error) {
      console.error("Error importing JSON: ", error);
      alert("Error importing JSON: " + error.message);
    }
  };

  // add relationship lines, if there are any
  useEffect(() => {
    if (importedNodes.length > 0) {
      const edges = [];
      importedNodes.forEach((node) => {
        node.data.properties.forEach((prop) => {
          if (typeof prop.type === "object" && prop.type.$ref) {
            const refSchemaName = prop.type.$ref.replace("#/components/schemas/", "");

            // find the target node by label
            const targetNode = importedNodes.find((n) => n.data.label === refSchemaName);

            if (targetNode) {
              edges.push({
                id: `edge-${node.id}-${targetNode.id}`,
                source: node.id,
                target: targetNode.id,
                type: "smoothstep",
                animated: false,
                label: prop.name,
                style: { stroke: "#888", strokeWidth: 2 },
              });
            }
          }
        });
      });

      setEdges(edges);
    }
    // run after nodes are updated
  }, [importedNodes]);


  return (
    <div style={{ width: "100vw", height: "100vh", display: "flex" }}>

    {/* title bar for mobile */}
    <div className="title-bar">
      <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="menu-button">☰</button>
      <h2 className="title-text">OpenAPI Engineer</h2>
    </div>

    {/* properties popup --------------------------------------------------- */}
    {isSidebarVisible && (

      <div
        style={{
          position: "fixed",
          width: "100vw",
          height: "100vh",
          backgroundColor: "rgba(0,0,0,0.5)",
          padding: "20px",
          borderRadius: "8px",
          boxShadow: "0px 4px 6px rgba(0,0,0,0.1)",
          minWidth: "300px",
          textAlign: "center",
          zIndex: "10",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: isSidebarVisible ? "block" : "none",
          }}
          className="property-popup"
          style={{
            height: "auto",
          }}
        >

          <button
            onClick={closeSidebar}
            className="close-popup-button"
          >
            <strong>X</strong>
          </button>

          <h4 style={{
            color: "black",
            textAlign: "center",
            marginTop: "10px",
            fontSize: "22px",
          }}>
            Add Property to {selectedEntity ? selectedEntity.data.label : "Entity"}
          </h4>

          {/* property name */}
          <div
            style={{
              width: "100%",
              textAlign: "left",
              paddingTop: "20px",
            }}>
            <label
              style={{
                width: "100%",
                fontSize: "16px",
                textAlign: "left",
              }}
            >
              Name:
            </label>
            <input
                type="text"
                value={propertyText}
                onChange={(e) => setPropertyText(e.target.value)}
                placeholder="Property Name"
                style={{
                  width: "95%",
                  padding: "8px",
                  marginTop: "15px",
                  marginBottom: "20px",
                  fontSize: "14px",
                  borderRadius: "5px",
                  border: "1px solid #ccc",
                }}
            />
          </div>

          {/* property type */}
          <div
            style={{
              width: "100%",
              textAlign: "left",
              paddingTop: "20px",
            }}
          >
            <label
              style={{
                width: "95%",
                marginTop: "15px",
                fontSize: "16px",
                textAlign: "left",
              }}
            >
              Type:
            </label>
            <br />
            <select
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value)}
              style={{
                width: "100%",
                padding: "8px",
                marginTop: "15px",
                marginBottom: "20px",
                fontSize: "14px",
                borderRadius: "5px",
                border: "1px solid #ccc",
                cursor: "pointer",
                background: "white",
                color: "black",
              }}
            >
              <option value="String">String</option>
              <option value="integer">Integer</option>
              <option value="Float">Float</option>
              <option value="Boolean">Boolean</option>
              {/* add in user created objects */}
              <option disabled>──────────</option>
              {nodes
                .filter((node) => node.id !== selectedNodeId) // prevent self-reference
                .map((node) => (
                  <option key={node.id} value={node.data.label}>
                    {node.data.label} (Custom Type)
                  </option>
              ))}
            </select>
          </div>

          {/* checkbox to mark property as an array */}
          <div
            style={{
              width: "100%",
              textAlign: "left",
              paddingTop: "10px"
            }}
          >
            <label style={{ fontSize: "16px" }}>
              <input
                type="checkbox"
                checked={isArray}
                onChange={(e) => setIsArray(e.target.checked)}
              /> Make this property an array of values
            </label>
          </div>

          {/* enum stuff */}
          {/* enum checkbox - enums are only for strings and integers */}
          {(["string", "integer"].includes(propertyType.toLowerCase())) && (
            <div
                style={{
                  width: "100%",
                  textAlign: "left",
                  paddingTop: "20px",
                }}
            >
              <label style={{ fontSize: "16px" }}>
                <input
                  type="checkbox"
                  checked={isEnum}
                  onChange={(e) => {
                    setIsEnum(e.target.checked);
                    if (!e.target.checked) setEnumValues("");
                  }}
                /> Enable Enum
              </label>
            </div>
          )}

          {/* enum input field - comma separated list (only visible if Enum is enabled) */}
          {isEnum && (["string", "integer"].includes(propertyType.toLowerCase())) && (
            <div
              style={{
                width: "100%",
                textAlign: "left",
                paddingTop: "10px",
              }}
            >
              <label style={{ fontSize: "16px" }}>Enum Values (comma-separated list):</label>
              <input
                type="text"
                value={enumValues}
                onChange={(e) => setEnumValues(e.target.value)}
                placeholder="e.g. active, inactive, pending"
                style={{
                  width: "95%",
                  padding: "8px",
                  marginTop: "10px",
                  fontSize: "14px",
                  borderRadius: "5px",
                  border: "1px solid #ccc",
                }}
              />
            </div>
          )}

          {/* property description */}
          <div
            style={{
              width: "100%",
              textAlign: "left",
              paddingTop: "20px",
            }}
          >
            <label
              style={{
                width: "100%",
                marginTop: "15px",
                fontSize: "16px",
                textAlign: "left",
              }}
            >
              Description:
            </label>
            <input
              type="text"
              value={propertyDescription}
              onChange={(e) => setPropertyDescription(e.target.value)}
              placeholder="Property Description"
              style={{
                width: "95%",
                padding: "8px",
                marginTop: "15px",
                marginBottom: "20px",
                fontSize: "14px",
                borderRadius: "5px",
                border: "1px solid #ccc",
                height: "20px",
              }}
            />
          </div>

          {/* property example */}
          <div style={{ width: "100%", textAlign: "left", paddingTop: "20px" }}>
            <label style={{ width: "100%", fontSize: "16px", textAlign: "left" }}>
              Example:
            </label>
            <input
              type="text"
              value={propertyExample}
              onChange={(e) => setPropertyExample(e.target.value)}
              placeholder="Property example"
              style={{
                width: "95%",
                padding: "8px",
                marginTop: "15px",
                marginBottom: "20px",
                fontSize: "14px",
                borderRadius: "5px",
                border: "1px solid #ccc",
              }}
            />
          </div>

          {/* add property button */}
          <button
              onClick={addPropertyToNode}
              className="button-one button-two"
            >
            Save Property
          </button>
        </div>
      </div>

    )}


    {/* API path popup ----------------------------------------------------- */}
    {isPathPopupVisible && (

      <div
        style={{
          position: "fixed",
          width: "100vw",
          height: "100vh",
          backgroundColor: "rgba(0,0,0,0.5)",
          padding: "20px",
          borderRadius: "8px",
          boxShadow: "0px 4px 6px rgba(0,0,0,0.1)",
          textAlign: "center",
          zIndex: "10",
        }}
      >

        {/* white popup */}
        <div
          className="path-popup"
        >

        {/* sticky header */}
        <div
          style={{
            position: "sticky",
            top: "0",
            background: "white",
            padding: "10px",
            fontSize: "18px",
            fontWeight: "bold",
            textAlign: "center",
            borderBottom: "1px solid #ddd",
            zIndex: 10,
            marginBottom: "25px",
          }}
        >
          {/* close path popup button */}
          <button
            onClick={() => setIsPathPopupVisible(false)}
            className="close-popup-button"
          >
            <strong>X</strong>
          </button>

          <h3
            style={{
              textAlign: "center",
              fontSize: "22px",
            }}
          >
            Add API Path
          </h3>

        </div>

          {/* path form content */}
          <div
            style={{
              textAlign: "left",
              width: "100%",
            }}
          >

            {/* path endpoint */}
            <div
              style={{
                paddingTop: "15px",
              }}
            >
              <label
                style={{
                  width: "90%",
                  fontSize: "14px",
                  textAlign: "left",
                }}
              >
                Path Endpoint:
              </label>
              <input
                type="text"
                value={newPath}
                onChange={(e) => setNewPath(e.target.value)}
                placeholder="/example-path"
                style={{
                  width: "95%",
                  marginTop: "15px",
                  marginBottom: "20px",
                  padding: "8px",
                  marginBottom: "8px",
                  fontSize: "14px",
                  borderRadius: "5px",
                  border: "1px solid #ccc",
                }}
              />
            </div>

            {/* HTTP method dropdown */}
            {/* GET,POST,PUT,DELETE,PATCH */}
            <div
              style={{
                paddingTop: "15px",
              }}
            >
              <label
                style={{
                  width: "90%",
                  fontSize: "14px",
                  textAlign: "left",
                }}
              >
                HTTP Method:
              </label>
              <select
                value={httpMethod}
                onChange={(e) => setHttpMethod(e.target.value)}
                style={{
                  width: "99%",
                  padding: "8px",
                  marginTop: "15px",
                  marginBottom: "20px",
                  fontSize: "14px",
                  borderRadius: "5px",
                  border: "1px solid #ccc",
                  cursor: "pointer",
                  background: "white",
                  color: "black",
                }}
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>

            {/* path summary */}
            <div
              style={{
                paddingTop: "15px",
              }}
            >
              <label
                style={{
                  width: "90%",
                  fontSize: "14px",
                  textAlign: "left",
                }}
              >
                Summary:
              </label>
              <input
                type="text"
                value={pathSummary}
                onChange={(e) => setPathSummary(e.target.value)}
                placeholder="Short description of the endpoint"
                style={{
                  width: "95%",
                  marginTop: "15px",
                  marginBottom: "20px",
                  padding: "8px",
                  fontSize: "14px",
                  borderRadius: "5px",
                  border: "1px solid #ccc",
                }}
              />
            </div>

            {/* path description - optional */}
            <div
              style={{
                paddingTop: "15px",
              }}
            >
              <label
                style={{
                  width: "90%",
                  padding: "8px",
                  fontSize: "14px",
                  textAlign: "left",
                }}
              >
                Description (optional):
              </label>
              <textarea
                value={pathDescription}
                onChange={(e) => setPathDescription(e.target.value)}
                placeholder="Detailed description of this API path"
                style={{
                  width: "95%",
                  marginTop: "15px",
                  padding: "8px",
                  marginBottom: "20px",
                  fontSize: "14px",
                  borderRadius: "5px",
                  border: "1px solid #ccc",
                  minHeight: "60px",
                  resize: "vertical",
                }}
              />
            </div>

            {/* path operation id - optional */}
            <div
              style={{
                paddingTop: "15px",
              }}
            >
              <label
                style={{
                  width: "90%",
                  fontSize: "14px",
                  textAlign: "left",
                }}
              >
                Operation ID (optional):
              </label>
              <input
                type="text"
                value={operationId}
                onChange={(e) => setOperationId(e.target.value)}
                placeholder="Unique identifier for this API operation"
                style={{
                  width: "95%",
                  marginTop: "15px",
                  marginBottom: "20px",
                  padding: "8px",
                  marginBottom: "20px",
                  fontSize: "14px",
                  borderRadius: "5px",
                  border: "1px solid #ccc",
                }}
              />
            </div>

            {/* path tag - optional */}
            <div
              style={{
                paddingTop: "15px",
              }}
            >
              <label
                style={{
                  width: "90%",
                  fontSize: "14px",
                  textAlign: "left",
                }}
              >
                Tag (optional):
              </label>
              <input
                type="text"
                value={pathTag}
                onChange={(e) => setPathTag(e.target.value)}
                placeholder="Category for this endpoint (e.g., Users, Orders)"
                style={{
                  width: "95%",
                  marginTop: "15px",
                  marginBottom: "20px",
                  padding: "8px",
                  marginBottom: "20px",
                  fontSize: "14px",
                  borderRadius: "5px",
                  border: "1px solid #ccc",
                }}
              />
            </div>

            {/* path parameters - optional */}
            <div
              style={{
                marginTop: "15px",
              }}
            >

              <label
                style={{
                  width: "90%",
                  fontSize: "16px",
                  textAlign: "left",
                }}
              >
                <strong>Parameters:</strong>
              </label>

              {/* show path parameter details */}
              {pathParameters.length > 0 ? (
                  pathParameters.map((param, index) => (
                    <div key={index}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "10px",
                        padding: "10px",
                        borderBottom: "1px solid #ddd",
                        width: "95%",
                      }}
                    >

                      {/* left column of parameter area */}
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-start",
                          marginBottom: "20px",
                          paddingBottom: "10px",
                          paddingLeft: "15px",
                        }}
                      >
                        {/* parameter name */}
                        <div style={{ marginTop: "25px" }}>
                          <label
                            style={{
                              marginRight: "62px",
                              fontSize: "14px",
                          }}>
                            Name:
                          </label>
                          <input
                            type="text"
                            value={param.name}
                            placeholder="Parameter Name"
                            onChange={(e) => updateParameter(index, "name", e.target.value)}
                            style={{
                              width: "90%",
                              marginTop: "15px",
                              padding: "8px",
                              fontSize: "14px",
                              borderRadius: "5px",
                              border: "1px solid #ccc",
                            }}
                          />
                        </div>

                        {/* parameter 'in' value */}
                        <div style={{ marginTop: "15px" }}>
                          <label
                            style={{
                              marginRight: "62px",
                              fontSize: "14px",
                          }}>
                            In:
                          </label>
                          <select
                            value={param.in}
                            onChange={(e) => updateParameter(index, "in", e.target.value)}
                            style={{
                              padding: "5px 20px 5px 20px",
                              minWidth: "150px",
                              fontSize: "14px",
                              borderRadius: "5px",
                              border: "1px solid #ccc",
                            }}
                          >
                            <option value="path">Path</option>
                            <option value="query">Query</option>
                            <option value="header">Header</option>
                            <option value="cookie">Cookie</option>
                          </select>
                        </div>

                        {/* parameter type */}
                        <div style={{ marginTop: "15px" }}>
                          <label
                            style={{
                              marginRight: "40px",
                              fontSize: "14px",
                          }}>
                            Type:
                          </label>
                          <select
                            value={param.type}
                            onChange={(e) => updateParameter(index, "type", e.target.value)}
                            style={{
                              padding: "5px 20px 5px 20px",
                              minWidth: "150px",
                              fontSize: "14px",
                              borderRadius: "5px",
                              border: "1px solid #ccc",
                            }}
                          >
                            <option value="string">String</option>
                            <option value="integer">Integer</option>
                            <option value="boolean">Boolean</option>
                            <option value="float">Float</option>
                          </select>
                        </div>

                        {/* is parameter required */}
                        <div style={{ marginTop: "15px" }}>
                          <label
                            style={{
                              fontSize: "14px",
                            }}
                          >
                            Is this parameter required?:
                          </label>
                          <input
                            type="checkbox"
                            style={{ marginLeft: "20px" }}
                            checked={param.required}
                            onChange={(e) => updateParameter(index, "required", e.target.checked)}
                          />
                        </div>

                        {/* parameter description */}
                        <div style={{ width: "100%", marginTop: "15px", }}>
                          <label
                            style={{
                              fontSize: "14px",
                            }}
                          >
                            Description:
                          </label>
                          <textarea
                            value={param.description || ""}
                            onChange={(e) => updateParameter(index, "description", e.target.value)}
                            placeholder="Enter description..."
                            style={{
                              height: "60px",
                              width: "90%",
                              marginTop: "15px",
                              marginBottom: "20px",
                              padding: "8px",
                              marginBottom: "20px",
                              fontSize: "14px",
                              borderRadius: "5px",
                              border: "1px solid #ccc",
                            }}
                          />
                        </div>
                      </div>

                      {/* right column of parameter area */}
                      <div
                        style={{
                          alignSelf: "flex-start",
                          paddingTop: "20px",
                        }}
                      >
                        {/* delete parameter button */}
                        <button
                          onClick={() => removeParameter(index)}
                          style={{
                            background: "white",
                            color: "#eb4034",
                            border: "1px solid #eb4034",
                            borderRadius: "5px",
                            width: "auto",
                            height: "auto",
                            cursor: "pointer",
                            marginLeft: "8px",
                            fontSize: "10px",
                            padding: "5px 12px 5px 12px",
                          }}
                        >
                          Delete Parameter
                        </button>
                      </div>

                    </div>
                  ))
                ) : (
                  <p>No parameters added yet.</p>
                )}

              {/* add parameter button */}
              <button
                onClick={addParameter}
                className="add-parameter-button"
              >
                + Add Parameter
              </button>
            </div>

          </div>


          {/* button container */}
          <div
            style={{
              position: "sticky",
              bottom: "0",
              background: "white",
              padding: "15px",
              paddingBottom: "25px",
              textAlign: "center",
              borderTop: "1px solid #ddd",
              zIndex: 10,
            }}
          >

            {/* save path button */}
            <button
              onClick={addPath}
              className="button-one button-two"
            >
              Save Path
            </button>
          </div>

        </div>
      </div>
    )}


    {/* export popup ------------------------------------------------------- */}
      {isExportPopupVisible && (
        <div
          style={{
            position: "fixed",
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0,0,0,0.5)",
            padding: "20px",
            borderRadius: "8px",
            boxShadow: "0px 4px 6px rgba(0,0,0,0.1)",
            minWidth: "300px",
            textAlign: "center",
            zIndex: "10",
          }}
        >
          <div
            className="export-popup"
          >
            <div
              style={{
                position: "sticky",
                top: "0",
                background: "white",
                padding: "15px",
                fontSize: "18px",
                fontWeight: "bold",
                textAlign: "center",
                borderBottom: "1px solid #ddd",
                zIndex: 10,
              }}
            >
              {/* close popup button */}
              <button
                onClick={closeExportPopup}
                className="close-popup-button"
              >
                <strong>X</strong>
              </button>

              <h3>OpenAPI Data {exportFormat.toUpperCase()}</h3>

            </div>

            <div
              style={{
                flexGrow: 1,
                overflowY: "auto",
                padding: "10px",
                maxHeight: "60vh",
              }}
            >
              <pre
                style={{
                  textAlign: "left",
                  marginTop: "50px",
                  whiteSpace: "pre-wrap",
                  wordWrap: "break-word",
                }}
              >
                {exportData}
              </pre>
            </div>

            {/* button div */}
            <div
              style={{
                position: "sticky",
                bottom: "0",
                background: "white",
                padding: "15px",
                textAlign: "center",
                borderTop: "1px solid #ddd",
                zIndex: 10,
              }}
            >
              {/* copy JSON button */}
              <button
                onClick={() => {
                  navigator.clipboard.writeText(exportData);
                  alert("Copied to clipboard!");
                }}
                className="button-one button-two"
              >
                Copy {exportFormat.toUpperCase()}
              </button>
            </div>
          </div>
        </div>
      )}


    {/* left sidebar ------------------------------------------------------- */}

    <div className={`left-sidebar ${isMenuOpen ? "open" : ""}`}>

      {/* close button for mobile */}
      <button className="close-sidebar-button" onClick={() => setIsMenuOpen(false)}><strong>X</strong></button>

      {/* sidebar header section */}
      <div className="sidebar-header">

        {/* header label */}
        <label
          className="header-main"
        >
          <strong>OpenAPI Engineer</strong>
        </label>
      </div>

      {/* sidebar content section */}
      <div className="sidebar-content">

        {/* div for entity details ------------------------------------------*/}
        <div className="accordion-section">

          <div className="accordion-header" onClick={toggleEntitySection}>

            {/* create entity label */}
            <label
              className="header-one"
            >
              <strong>Create a New Entity:</strong>
            </label>

            <span>{isEntitySectionOpen ? "▲" : "▼"}</span>

          </div>

          {isEntitySectionOpen && (

            <div className="accordion-content">

              {/* entity name */}
              <input
                type="text"
                value={entityLabel}
                onChange={(e) => setEntityLabel(e.target.value)}
                placeholder="Entity Name"
                className="text-input"
              />

              {/* add entity button */}
              <button
                onClick={addEntityNode}
                className="button-one"
              >
                + Entity
              </button>

            </div>
          )}
        </div>

        {/* div for path details --------------------------------------------*/}
        <div className="accordion-section">

          <div className="accordion-header" onClick={togglePathsSection}>

            {/* create add path label */}
            <label className="header-one">
              <strong>Add Paths:</strong>
            </label>

            <span>{isPathsSectionOpen ? "▲" : "▼"}</span>

          </div>

          {isPathsSectionOpen && (
            <div className="accordion-content">

              {/* show saved paths */}
              <div className="saved-paths-div">
                <h4
                  style={{
                    marginTop: "10px",
                    paddingBottom: "20px",
                    textAlign: "center",
                    borderBottom: "0.5px solid black",
                  }}
                >
                  Saved Paths:
                </h4>
                <ul>
                  {paths.map((pathObj, index) => (
                    <li key={index} className="accordion-item">

                      {/* Path Header - Click to Expand/Collapse */}
                      <div
                        className="path-header"
                        onClick={() => togglePathDetails(index)}
                        style={{
                          cursor: "pointer",
                          padding: "8px",
                          background: expandedPathIndex === index ? "#ddd" : "#f5f5f5",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontWeight: "bold",
                          transition: "background 0.3s",
                        }}
                      >
                        <span>
                          {pathObj.method} {pathObj.path}
                        </span>
                        <span>{expandedPathIndex === index ? "▲" : "▼"}</span>
                      </div>

                      {/* Expanded Details */}
                      {expandedPathIndex === index && (
                        <div className="path-details" style={{ padding: "10px", background: "#fff" }}>
                          <p><strong>Summary:</strong> {pathObj.summary || "No summary provided"}</p>
                          <p><strong>Description:</strong> {pathObj.description || "No description"}</p>
                          <p><strong>Operation ID:</strong> {pathObj.operationId || "No operationId"}</p>
                          <p><strong>Tag:</strong> {pathObj.tag || "No tag"}</p>

                          {/* Path Parameters */}
                          {pathObj.parameters && pathObj.parameters.length > 0 ? (
                            <div>
                              <p><strong>Parameters:</strong></p>
                              <ul style={{ paddingLeft: "20px" }}>
                                {pathObj.parameters.map((param, paramIndex) => (
                                  <li key={paramIndex} style={{ fontSize: "12px", color: "#555" }}>
                                    <strong>{param.name}</strong> ({param.type}) - {param.in}
                                    {param.description && `: ${param.description}`}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : (
                            <p>No parameters</p>
                          )}

                          {/* Delete Path Button */}
                          <button
                            onClick={() => deletePath(index)}
                            style={{
                              background: "red",
                              color: "white",
                              border: "none",
                              padding: "5px 8px",
                              borderRadius: "5px",
                              cursor: "pointer",
                              marginTop: "5px",
                            }}
                          >
                            Delete Path
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              {/* add path button */}
              <button
                onClick={() => {
                  setIsMenuOpen(false);

                  // if on mobile, delay the popup until the sidebar is closed
                  if (window.innerWidth < 768) {
                    setTimeout(() => setIsPathPopupVisible(true), 300);
                  } else {
                    setIsPathPopupVisible(true);
                  }
                }}
                className="button-one"
              >
                + Add Path
              </button>

            </div>
          )}
        </div>

        {/* Accordion: Edit OpenAPI Metadata --------------------------------*/}
        <div className="accordion-section">
          <div className="accordion-header" onClick={() => setIsMetadataOpen(!isMetadataOpen)}>

            <label
              className="header-one"
            >
              <strong>API Metadata</strong>
            </label>

            <span>{isMetadataOpen ? "▲" : "▼"}</span>

          </div>

          {isMetadataOpen && (
            <div className="accordion-content">

              <div className="metadata-content-div">
                <label className="small-label">Title:</label>
                <input
                  className="text-input"
                  type="text"
                  value={openAPIMetadata.title}
                  onChange={(e) => setOpenAPIMetadata({ ...openAPIMetadata, title: e.target.value })}
                  placeholder="API Title"
                />
              </div>

              <div className="metadata-content-div">
                <label className="small-label">Version:</label>
                <input
                  className="text-input"
                  type="text"
                  value={openAPIMetadata.version}
                  onChange={(e) => setOpenAPIMetadata({ ...openAPIMetadata, version: e.target.value })}
                  placeholder="API Version"
                />
              </div>

              <div className="metadata-content-div">
                <label className="small-label">License:</label>
                <input
                  className="text-input"
                  type="text"
                  value={openAPIMetadata.license}
                  onChange={(e) => setOpenAPIMetadata({ ...openAPIMetadata, license: e.target.value })}
                  placeholder="License (e.g., MIT)"
                />
              </div>

              <div className="metadata-content-div">
                <label className="small-label">Authors:</label>
                <input
                  className="text-input"
                  type="text"
                  value={openAPIMetadata.authors}
                  onChange={(e) => setOpenAPIMetadata({ ...openAPIMetadata, authors: e.target.value })}
                  placeholder="Author(s)"
                />
              </div>

              <div className="metadata-content-div">
                <label className="small-label">External Docs:</label>
                <input
                  className="text-input"
                  type="text"
                  value={openAPIMetadata.externalDocs}
                  onChange={(e) => setOpenAPIMetadata({ ...openAPIMetadata, externalDocs: e.target.value })}
                  placeholder="External Documentation URL"
                />
              </div>

              <div className="metadata-content-div">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    width: "100%",
                  }}
                >
                  <label className="small-label">Servers:</label>
                  <button
                    className="add-server-button"
                    onClick={() =>
                      setOpenAPIMetadata({
                        ...openAPIMetadata,
                        servers: [...openAPIMetadata.servers, { url: "", description: "" }],
                      })
                    }
                  >
                    + Add Server
                  </button>
                </div>

                {openAPIMetadata.servers.map((server, index) => (
                  <div className="server-list-div" key={index}>


                    <div className="metadata-server-div">

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          width: "100%",
                        }}
                      >

                        <label className="small-label-two">
                          <strong>
                            {index === 0 ? "Default Server" : `Server ${index + 1}`}
                          </strong>
                        </label>


                        {/* delete server button */}
                        {index > 0 && (
                          <button
                            onClick={() => {
                              const newServers = openAPIMetadata.servers.filter((_, i) => i !== index);
                              setOpenAPIMetadata({ ...openAPIMetadata, servers: newServers });
                            }}
                            className="delete-server-button"
                          >
                            X
                          </button>
                        )}

                      </div>

                      <label className="small-label-two">URL:</label>
                      <input
                        className="text-input"
                        type="text"
                        value={server.url}
                        onChange={(e) => {
                          const newServers = [...openAPIMetadata.servers];
                          newServers[index].url = e.target.value;
                          setOpenAPIMetadata({ ...openAPIMetadata, servers: newServers });
                        }}
                        placeholder="Server URL"
                      />

                      <label className="small-label-two">Description:</label>
                      <input
                        className="text-input"
                        type="text"
                        value={server.description}
                        onChange={(e) => {
                          const newServers = [...openAPIMetadata.servers];
                          newServers[index].description = e.target.value;
                          setOpenAPIMetadata({ ...openAPIMetadata, servers: newServers });
                        }}
                        placeholder="Server Description"
                      />
                    </div>

                  </div>
                ))}
              </div>

              {/* save metadata button */}
              <button
                onClick={() => {
                  setIsMetadataOpen(false);
                }}
                className="button-one"
              >
                Save Metadata
              </button>

            </div>
          )}
        </div>
      </div>

      {/* sidebar footer section --------------------------------------------*/}
      <div className="sidebar-footer">

        {/* export format selection */}
        <div
          style={{
            marginTop: "20px",
          }}
        >
          <label className="small-label">Export Format:</label>
          <select className="selection-dropdown" value={exportFormat} onChange={(e) => setExportFormat(e.target.value)}>
            <option value="json">JSON</option>
            <option value="yaml">YAML</option>
          </select>
        </div>

        {/* export OpenAPI schema button */}
        <button
            onClick={showExportPopup}
            className="export-button"
        >
            <strong>Export</strong>
        </button>

        {/* import OpenAPI json button */}
        <button
            onClick={() => {
              setIsMenuOpen(false);
              setIsImportPopupVisible(true)
            }}
            className="export-button import-button"
        >
            <strong>Import</strong>
        </button>

      </div>

    </div>


    {/* import JSON popup -------------------------------------------------- */}
    {isImportPopupVisible && (

        <div
          style={{
            position: "fixed",
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0,0,0,0.5)",
            padding: "20px",
            borderRadius: "8px",
            boxShadow: "0px 4px 6px rgba(0,0,0,0.1)",
            minWidth: "300px",
            textAlign: "center",
            zIndex: "10",
          }}
        >
          {/* white popup div */}
          <div
            className="import-popup"
          >

            {/* close import popup button */}
            <button
              onClick={() => setIsImportPopupVisible(false)}
              className="close-popup-button"
            >
              <strong>X</strong>
            </button>

            {/* header */}
            <h3
              style={{
                textAlign: "center",
                fontSize: "22px",
              }}
            >
              Import OpenAPI JSON
            </h3>

            {/* textbox for JSON */}
            <textarea
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              placeholder="Paste your JSON here..."
              style={{
                width: "95%",
                flexGrow: "1",
                overflowY: "auto",
                marginTop: "20px",
                padding: "10px",
                borderRadius: "5px",
                border: "1px solid #ccc",
              }}
            />

            <div style={{
              marginTop: "20px",
              display: "flex",
              justifyContent: "center",
            }}>
              <button
                onClick={importOpenAPI}
                className="button-one button-two"
              >
                Import
              </button>

            </div>

          </div>
        </div>
      )}

    {/* main ReactFlow container */}
    <div style={{ flexGrow: 1 }}>
      <ReactFlow

        nodes={nodes.map((node) => ({
          ...node,
          data: {
            ...node.data,
            onAddProperty: () => toggleSidebar(node.id),
            onDeleteProperty: deleteProperty,
            onEditProperty: (propertyIndex) => editProperty(node.id, propertyIndex),
          },
        }))}

        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
      >
        <Controls />
        <MiniMap />
        <Background variant="dots" gap={12} size={1} />
      </ReactFlow>
    </div>
  </div>
);

}


/*
YAML example:
// generate OpenAPI report
const generateOpenAPI = () => {

  // no entity nodes
  if (nodes.length === 0) return "No data to export.";

  // basic OpenAPI metadata
  let openAPISchema =
    `openapi: 3.0.0\ninfo:\n  title: Sample API Title\n  version: 1.0.0\n  description: Optional multiline or single-line description.\n\n`;
  openAPISchema += `servers:\n  - url: https://api.example.com/v1\n  description: Production Server\n`;
  openAPISchema += `  - url: https://staging-api.example.com\n  description: Staging Server\n\n`;

  // security info
  openAPISchema += `security:\n  - ApiKeyAuth: []\n\n`;

  // API paths
  openAPISchema += `paths:\n`;
  paths.forEach((path) => {
    openAPISchema += `  ${path.path}:\n`;
    openAPISchema += `    ${path.method.toLowerCase()}:\n`;
    openAPISchema += `      summary: ${path.summary || "No summary"}\n`;
    openAPISchema += `      description: ${path.description || "No description"}\n`;
    openAPISchema += `      operationId: ${path.operationId || "No operation Id"}\n`;
    openAPISchema += `      tags:\n`;
    openAPISchema += `        - ${path.tag || "No tag"}\n`;

    // parameter stuff here
    if (path.parameters.length > 0) {
      openAPISchema += `      parameters:\n`;
      path.parameters.forEach((param) => {
        openAPISchema += `        - name: ${param.name}\n`;
        openAPISchema += `          in: ${param.in}\n`;
        openAPISchema += `          required: ${param.required}\n`;
        openAPISchema += `          schema:\n`;
        openAPISchema += `            type: ${param.type}\n`;
        if (param.description) {
          openAPISchema += `          description: ${param.description}\n`;
        }
      });
    }

    // responses
    openAPISchema += `\n`;
    openAPISchema += `      responses:\n`;
    openAPISchema += `        "200":\n`;
    openAPISchema += `          description: Successful response\n`;
    openAPISchema += `          content:\n`;
    openAPISchema += `            application/json:\n`;
    openAPISchema += `              schema:\n`;
    openAPISchema += `                $ref: "#/components/schemas/User"\n`;
    openAPISchema += `        "400":\n`;
    openAPISchema += `          description: Bad request\n`;
    openAPISchema += `        "401":\n`;
    openAPISchema += `          description: Unauthorized\n`;
    openAPISchema += `        "404":\n`;
    openAPISchema += `          description: User not found\n`;
    openAPISchema += `        "500":\n`;
    openAPISchema += `          description: Internal server error\n`;
    openAPISchema += `      "deprecated: false":\n\n`;
  });

  // components
  openAPISchema += `components:\n`;
  openAPISchema += `  securitySchemes:\n`;
  openAPISchema += `    ApiKeyAuth:\n`;
  openAPISchema += `      type: apiKey\n`;
  openAPISchema += `      in: header\n`;
  openAPISchema += `      name: Authorization\n\n`;

  // schemas and properties
  openAPISchema += `  schemas:\n`;

  // add entity and property details
  nodes.forEach((node) => {
    openAPISchema += `    ${node.data.label}:\n      type: object\n      properties:\n`;

    if (node.data.properties && node.data.properties.length > 0) {
      node.data.properties.forEach((prop) => {
        openAPISchema += `        ${prop.name}:\n          type: ${prop.type.toLowerCase()}\n`;
        if (prop.description) {
          openAPISchema += `          description: ${prop.description}\n`;
        }
      });
    } else {
      openAPISchema += "        # No properties added yet\n";
    }
  });

  return openAPISchema;
};
*/
