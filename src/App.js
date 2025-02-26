import React, { useCallback, useState } from 'react';
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
  const [paths, setPaths] = useState([]);
  const [newPath, setNewPath] = useState("");
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

  // get the entity name for properties popup
  const selectedEntity = nodes.find((node) => node.id === selectedNodeId);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  // generate OpenAPI report
  const generateOpenAPI = () => {
    if (nodes.length === 0) return "No data to export.";

    // create base OpenAPI schema
    const schema = {
      openapi: "3.0.0",
      info: {
        title: "Sample API Title",
        version: "1.0.0",
        description: "Optional multiline or single-line description.",
      },
      servers: [
        {
          url: "https://api.example.com/v1",
          description: "Production Server",
        },
        {
          url: "https://staging-api.example.com",
          description: "Staging Server",
        },
      ],
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
    };

    // create paths
    paths.forEach((path) => {
      const method = path.method.toLowerCase();
      // Create the path if it doesn't exist
      if (!schema.paths[path.path]) {
        schema.paths[path.path] = {};
      }
      schema.paths[path.path][method] = {
        summary: path.summary || "No summary",
        description: path.description || "No description",
        operationId: path.operationId || "No operation Id",
        tags: [path.tag || "No tag"],
        responses: {
          "200": {
            description: "Successful response",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/User",
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

      // If there are parameters, add them as an array
      if (path.parameters && path.parameters.length > 0) {
        schema.paths[path.path][method].parameters = path.parameters.map((param) => {
          const paramObj = {
            name: param.name,
            in: param.in,
            required: param.required,
            schema: {
              type: param.type,
            },
          };
          if (param.description) {
            paramObj.description = param.description;
          }
          return paramObj;
        });
      }
    });

    // create entities
    nodes.forEach((node) => {
      const entityLabel = node.data.label;
      // Create an object for each entity
      schema.components.schemas[entityLabel] = {
        type: "object",
        properties: {},
      };

      if (node.data.properties && node.data.properties.length > 0) {
        node.data.properties.forEach((prop) => {
          schema.components.schemas[entityLabel].properties[prop.name] = {
            type: prop.type.toLowerCase(),
          };
          if (prop.description) {
            schema.components.schemas[entityLabel].properties[prop.name].description = prop.description;
          }
        });
      }
    });

    // convert object into a formatted JSON string
    return JSON.stringify(schema, null, 2);
  };

  // show export popup
  const showExportPopup = () => {
    const apiSchema = generateOpenAPI();
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

    setNodes((prevNodes) =>
      prevNodes.map((node) =>
        node.id === selectedNodeId
          ? {
            ...node,
            data: {
              ...node.data,
              properties: [
                ...(node.data.properties || []),
                {
                  name: propertyText,
                  type: propertyType,
                  description: propertyDescription
                },
              ],
            },
           }
        : node
      )
    );

    // clear inputs
    setPropertyText("");
    setPropertyType("String");
    setPropertyDescription("");

    // close popup
    closeSidebar();
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
  };

  // add entity function
  const addEntityNode = () => {
    const newId = `node-${nodes.length + 1}`;
    const label = entityLabel.trim() || `Entity ${nodes.length + 1}`;
    const newNode = {
      id: newId,
      type: "entity",
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: { label },
    };

    setNodes((nds) => [...nds, newNode]);
    setEntityLabel("");
  };

  // import OpenAPI JSON function
  const importOpenAPI = () => {
    try {
      const schema = JSON.parse(importData);

      // basic OpenAPI validation
      if (!schema.openapi || !schema.info) {
        window.alert("Invalid OpenAPI schema.");
        return;
      }

      // clear anything on the screen
      setNodes([]);
      setPaths([]);

      // create entities
      if (schema.components && schema.components.schemas) {
        const importedNodes = Object.entries(schema.components.schemas).map(
          ([schemaName, schemaData], index) => {
            return {
              id: `node-${index + 1}`,
              type: "entity",
              position: { x: Math.random() * 400, y: Math.random() * 400 },
              data: {
                label: schemaName,
                properties: schemaData.properties
                  ? Object.entries(schemaData.properties).map(
                      ([propName, propData]) => ({
                        name: propName,
                        type: propData.type,
                        description: propData.description || "",
                      })
                    )
                  : [],
              },
            };
          }
        );
        setNodes(importedNodes);
      }

      // create paths
      if (schema.paths) {
        const importedPaths = [];
        Object.entries(schema.paths).forEach(([pathKey, methodsObj]) => {
          Object.entries(methodsObj).forEach(([method, methodObj]) => {
            importedPaths.push({
              path: pathKey,
              method: method.toUpperCase(),
              summary: methodObj.summary || "",
              description: methodObj.description || "",
              operationId: methodObj.operationId || "",
              tag: (methodObj.tags && methodObj.tags[0]) || "",
              parameters: methodObj.parameters || [],
            });
          });
        });
        setPaths(importedPaths);
      }

      setImportData("");
      setIsImportPopupVisible(false);
    } catch (error) {
      console.error("Error importing JSON: ", error);
      alert("Error importing JSON: " + error.message);
    }
  };




  return (
    <div style={{ width: "100vw", height: "100vh", display: "flex" }}>

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
            width: "60vw",
            maxWidth: "550px",
            height: "auto",
            maxHeight: "750px",
            padding: "20px",
            background: "white",
            border: "1px solid black",
            position: "absolute",
            left: "50%",
            top: "50%" ,
            transform: "translate(-50%, -50%)",
            transition: "opacity 0.3s ease-in-out",
            display: isSidebarVisible ? "block" : "none",
            zIndex: "10",
            borderRadius: "10px",
            boxShadow: "2px 2px 10px rgba(0,0,0,0.3)",
          }}
        >

          <button
            onClick={closeSidebar}
            style={{
              position: "absolute",
              top: "15px",
              right: "15px",
              background: "red",
              color: "white",
              border: "none",
              padding: "5px",
              borderRadius: "5px",
              fontSize: "14px",
              cursor: "pointer",
              width: "24px",
              height: "24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <strong>X</strong>
          </button>

          <h4 style={{
            color: "black",
            textAlign: "center",
            marginTop: "10px",
            fontSize: "24px",
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
              <option value="Float">Float</option>
              <option value="Boolean">Boolean</option>
            </select>
          </div>

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
                height: "200px",
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
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "white",
            padding: "0px 20px 0px 20px",
            borderRadius: "8px",
            boxShadow: "0px 4px 6px rgba(0,0,0,0.1)",
            textAlign: "left",
            minWidth: "500px",
            maxWidth: "80vw",
            maxHeight: "80vh",
            overflowY: "auto",
          }}
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
            style={{
              position: "absolute",
              top: "20px",
              right: "25px",
              background: "red",
              color: "white",
              border: "none",
              padding: "10px",
              borderRadius: "5px",
              fontSize: "14px",
              cursor: "pointer",
              width: "30px",
              height: "30px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <strong>X</strong>
          </button>

          <h3 style={{ textAlign: "center", }}>Add API Path</h3>

        </div>

          {/* path form content */}
          <div>




            {/* path endpoint */}
            <div>
              <label
                style={{
                  width: "90%",
                  marginTop: "15px",
                  fontSize: "16px",
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
                  width: "90%",
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
            <div>
              <label
                style={{
                  width: "90%",
                  fontSize: "16px",
                  textAlign: "left",
                }}
              >
                HTTP Method:
              </label>
              <select
                value={httpMethod}
                onChange={(e) => setHttpMethod(e.target.value)}
                style={{
                  width: "90%",
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
            <div>
              <label
                style={{
                  width: "90%",
                  marginTop: "15px",
                  fontSize: "16px",
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
                  width: "90%",
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
            <div>
              <label
                style={{
                  width: "90%",
                  marginTop: "15px",
                  padding: "8px",
                  fontSize: "16px",
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
                  width: "90%",
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
            <div>
              <label
                style={{
                  width: "90%",
                  marginTop: "15px",
                  fontSize: "16px",
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

            {/* path tag - optional */}
            <div>
              <label
                style={{
                  width: "90%",
                  marginTop: "15px",
                  fontSize: "16px",
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

            {/* path parameters - optional */}
            <div style={{ marginTop: "20px" }}>

              <label
                style={{
                  width: "90%",
                  marginTop: "15px",
                  fontSize: "16px",
                  textAlign: "left",
                }}
              >
                Parameters:
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
                            color: "red",
                            border: "1px solid red",
                            borderRadius: "5px",
                            width: "auto",
                            height: "auto",
                            cursor: "pointer",
                            marginLeft: "8px",
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
                style={{
                  padding: "8px",
                  backgroundColor: "white",
                  border: "1px solid black",
                  color: "black",
                  fontSize: "16px",
                  borderRadius: "5px",
                  cursor: "pointer",
                  marginTop: "10px",
                  width: "80%",
                  marginLeft: "50px",
                  marginBottom: "50px",
                }}
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
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: "white",
              padding: "20px",
              borderRadius: "8px",
              boxShadow: "0px 4px 6px rgba(0,0,0,0.1)",
              minWidth: "500px",
              maxWidth: "80vw",
              maxHeight: "80vh",
              overflowY: "auto",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
            }}
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
                style={{
                  position: "absolute",
                  top: "20px",
                  right: "25px",
                  background: "red",
                  color: "white",
                  border: "none",
                  padding: "10px",
                  borderRadius: "5px",
                  fontSize: "14px",
                  cursor: "pointer",
                  width: "30px",
                  height: "30px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <strong>X</strong>
              </button>

              <h3>OpenAPI Data</h3>

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
                Copy JSON
              </button>
            </div>
          </div>
        </div>
      )}


    {/* left sidebar ------------------------------------------------------- */}
    <div className="left-sidebar">

      {/* sidebar header section */}
      <div className="sidebar-header">
        {/* create entity label */}
        <label
          className="header-main"
        >
          <strong>OpenAPI Engineer</strong>
        </label>
      </div>

      {/* sidebar content section */}
      <div className="sidebar-content">

        {/* div for entity details */}
        <div>
          {/* create entity label */}
          <label
            className="header-one"
          >
            <strong>Create a New Entity:</strong>
          </label>

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

        {/* div for path details */}
        <div className="sidebar-path-div">
          {/* create add path label */}
          <label
            className="header-one"
          >
            <strong>Add Paths:</strong>
          </label>

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
                <li key={index}
                  style={{
                    marginBottom: "20px",
                  }}
                >
                  <div className="saved-path-item">
                    <strong
                      style={{
                        fontSize: "14px",
                      }}
                    >
                      {pathObj.method} {pathObj.path}
                    </strong>
                    <button
                      onClick={() => deletePath(index)}
                      style={{
                        background: "white",
                        color: "red",
                        border: "none",
                        padding: "2px 6px",
                        fontSize: "14px",
                        borderRadius: "5px",
                        cursor: "pointer",
                        marginLeft: "25px",
                      }}
                    >
                      <strong>X</strong>
                    </button>
                  </div>
                  <span style={{ fontSize: "11px", color: "#555", fontStyle: "italic" }}>
                    <strong>Summary:</strong> {pathObj.summary || "No summary provided"}
                  </span>
                  <br />
                  <span style={{ fontSize: "11px", color: "#555", fontStyle: "italic" }}>
                    <strong>Description:</strong> {pathObj.description || "No description"}
                  </span>
                  <br />
                  <span style={{ fontSize: "11px", color: "#555", fontStyle: "italic" }}>
                    <strong>Operation ID:</strong> {pathObj.operationId || "No operationId"}
                  </span>
                  <br />
                  <span style={{ fontSize: "11px", color: "#555", fontStyle: "italic" }}>
                    <strong>Tag:</strong> {pathObj.tag || "No tag"}
                  </span>
                  {pathObj.parameters && pathObj.parameters.length > 0 && (
                    <div style={{ marginTop: "5px", }}>
                      <span
                        style={{
                          fontSize: "11px",
                          color: "#555",
                          fontStyle: "italic"
                        }}
                      >
                        <strong>Parameters:</strong>
                      </span>
                      <ul style={{ paddingLeft: "20px" }}>
                        {pathObj.parameters.map((param, paramIndex) => (
                          <li key={paramIndex}
                            style={{
                              fontSize: "11px",
                              color: "#555",
                              fontStyle: "italic"
                            }}
                          >
                            <strong>{param.name}</strong> ({param.type}) - {param.in}
                            {param.description && `: ${param.description}`}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* add path button */}
          <button
            onClick={() => setIsPathPopupVisible(true)}
            className="button-one"
          >
            + Add Path
          </button>

        </div>

      </div>

      {/* sidebar footer section */}
      <div className="sidebar-footer">

        {/* import OpenAPI json button */}
        <button
            onClick={() => setIsImportPopupVisible(true)}
            className="export-button import-button"
        >
            <strong>Import JSON</strong>
        </button>

        {/* export OpenAPI schema button */}
        <button
            onClick={showExportPopup}
            className="export-button"
        >
            <strong>Export</strong>
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
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: "white",
              padding: "20px",
              borderRadius: "8px",
              boxShadow: "0px 4px 6px rgba(0,0,0,0.1)",
              minWidth: "500px",
              maxWidth: "80vw",
              maxHeight: "80vh",
              minHeight: "500px",
              overflowY: "auto",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
            }}
          >

            {/* close import popup button */}
            <button
              onClick={() => setIsImportPopupVisible(false)}
              style={{
                position: "absolute",
                top: "20px",
                right: "25px",
                background: "red",
                color: "white",
                border: "none",
                padding: "10px",
                borderRadius: "5px",
                fontSize: "14px",
                cursor: "pointer",
                width: "30px",
                height: "30px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <strong>X</strong>
            </button>

            {/* header */}
            <h3 style={{ textAlign: "center" }}>Import OpenAPI JSON</h3>

            {/* textbox for JSON */}
            <textarea
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              placeholder="Paste your JSON here..."
              style={{
                width: "95%",
                height: "350px",
                marginTop: "20px",
                padding: "10px",
                borderRadius: "5px",
                border: "1px solid #ccc",
              }}
            />

            <div style={{
              marginTop: "20px",
              display: "flex",
              justifyContent: "space-between",
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
          data: { ...node.data, onAddProperty: () => toggleSidebar(node.id), onDeleteProperty: deleteProperty },
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
