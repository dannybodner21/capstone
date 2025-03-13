import React, { useState } from "react";
import { Handle, Position } from "@xyflow/react";

const CustomEntityNode = ({ id, data, isConnectable }) => {

  const [hoveredProperty, setHoveredProperty] = useState(null);

  return (

    <div
      style={{
        padding: "10px",
        border: "1px solid black",
        borderRadius: "5px",
        backgroundColor: "white",
        color: "black",
        textAlign: "center",
        minWidth: "250px",
        width: "auto",
        position: "relative",
        minHeight: "50px",
        height: "auto",
        boxShadow: "0px 4px 6px rgba(0,0,0,0.1)",
      }}
    >
      <strong>{data.label}</strong>

      <ul
        style={{
          listStyleType: "none",
          backgroundColor:"white",
          width:"auto",
          height:"auto",
          padding: "15px",
          paddingBottom: "30px",
          textAlign: "left",
          fontSize: "12px",
          borderTop: "0.5px solid black",
        }}>
            {data.properties && data.properties.map((prop, index) => (
              <li
                style={{
                  width:"100%",
                  height:"30px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "5px",
                  marginRight: "10px",
                }}
                key={index}
              >

                {/* add info circle to properties display */}
                <span
                  style={{
                    width: "10px",
                    height: "10px",
                    backgroundColor: "#32bf5e",
                    border: "1px solid #80ffa8",
                    borderRadius: "50%",
                    cursor: "pointer",
                    fontStyle: "italic",
                  }}
                  onMouseEnter={() => setHoveredProperty(index)}
                  onMouseLeave={() => setHoveredProperty(null)}
                >
                  {/* TODO: should there be an 'i' in the circle? */}
                </span>

                <span>
                  {prop.name}
                  <span
                    style={{
                      fontSize: "14px",
                      fontStyle: "italic",
                      color: "gray"
                    }}
                  >
                    (
                    {typeof prop.type === "object"
                      ? prop.type.type === "array"
                        ? `Array of ${prop.type.items.$ref ? prop.type.items.$ref.replace("#/components/schemas/", "") : prop.type.items.type}`
                        : prop.type.$ref
                          ? `Reference to ${prop.type.$ref.replace("#/components/schemas/", "")}`
                          : "Unknown Type"
                      : prop.type}
                    )
                  </span>
                </span>

                {/* Edit Button */}
                <button
                  onClick={() => data.onEditProperty(index)}
                  className="edit-property-button"
                >
                  Edit
                </button>

                <button
                  onClick={() => data.onDeleteProperty(id, index)}
                  style={{
                    background: "white",
                    color: "#eb4034",
                    border: "none",
                    padding: "0px 0px",
                    fontSize: "15px",
                    borderRadius: "5px",
                    cursor: "pointer",
                    marginLeft: "5px",
                  }}
                >
                  <strong>X</strong>
                </button>

                {/* property details hover box */}
                {hoveredProperty === index && (
                  <div
                    style={{
                      position: "absolute",
                      right: "105%",
                      top: "30px",
                      width: "auto",
                      maxWidth: "350px",
                      minWidth: "250px",
                      height: "auto",
                      maxHeight: "400px",
                      minHeight: "150px",
                      backgroundColor: "white",
                      border: "0.5px solid black",
                      borderRadius: "8px",
                      padding: "20px",
                      boxShadow: "2px 2px 10px rgba(0, 0, 0, 0.2)",
                      zIndex: 100,
                    }}
                  >
                    <p
                      style={{
                        fontWeight: "bold"
                      }}
                    >
                      Property Details:
                    </p>
                    <hr/>

                      {/* div to hold all the property popup details */}
                      <div
                        style={{
                          paddingLeft: "20px",
                          paddingTop: "10px",
                        }}
                      >

                        {/* Name: */}
                        <div className="property-popup-spacing-div">
                          <label style={{width:"100px"}}>
                            <strong>Name:</strong>
                          </label>
                          <span>
                            {prop.name}
                          </span>
                        </div>

                        {/* Type: */}
                        <div className="property-popup-spacing-div">
                          <label style={{width:"100px"}}>
                            <strong>Type:</strong> {" "}
                          </label>
                          <span>
                            {typeof prop.type === "object"
                              ? prop.type.type === "array"
                                ? `Array of ${
                                    prop.type.items?.$ref
                                      ? prop.type.items.$ref.replace("#/components/schemas/", "")
                                      : prop.type.items?.type || "Unknown"
                                  }`
                                : prop.type.$ref
                                ? `Reference to ${prop.type.$ref.replace("#/components/schemas/", "")}`
                                : "Unknown Type"
                              : prop.type}
                          </span>
                        </div>

                        {/* Is Array: */}
                        <div className="property-popup-spacing-div">
                          <label style={{width:"100px"}}>
                            <strong>Is Array:</strong>
                          </label>
                          <span>
                            {typeof prop.type === "object" && prop.type.type === "array" ? "Yes" : "No"}
                          </span>
                        </div>

                        {/* Is Enum: */}
                        {!prop.enum && (
                          <div className="property-popup-spacing-div">
                            <label style={{width:"100px"}}>
                              <strong>Is Enum:</strong>
                            </label>
                            <span>
                              No
                            </span>
                          </div>
                        )}

                        {/* if enum, display the enum values */}
                        {prop.enum && prop.enum.length > 0 && (
                          <div style={{paddingBottom: "5px"}}>

                            <div className="property-popup-spacing-div" style={{marginBottom:"5px"}}>
                              <label style={{width:"100px"}}>
                                <strong>Is Enum:</strong>
                              </label>
                              <span>
                                Yes
                              </span>
                            </div>

                            <label>
                              <strong>Enum Values:</strong>
                            </label>

                            <ul>
                              {prop.enum.map((value, i) => (
                                <li
                                  key={i}
                                  style={{
                                    fontSize: "12px",
                                    color: "#333",
                                    paddingLeft: "60px",
                                    paddingTop: "5px",
                                  }}
                                >
                                  {value}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Description: */}
                        <div className="property-popup-spacing-div">
                          <label style={{width:"100px"}}>
                            <strong>Description:</strong>
                          </label>
                          <span>
                            {prop.description ? prop.description : "None"}
                          </span>
                        </div>

                        {/* Example */}
                        <div className="property-popup-spacing-div">
                          <label style={{width:"100px"}}>
                            <strong>Example:</strong>
                          </label>
                          <span>
                            {prop.example ? prop.example : "None"}
                          </span>
                        </div>

                      </div>

                  </div>
                )}

              </li>
            ))}
      </ul>

      {/* Add Property Button */}
      <button
        onClick={() => {
          if (data.onAddProperty) {
            data.onAddProperty();
          } else {
            console.log("onAddProperty function is missing");
          }
        }}
        style={{
          position: "absolute",
          bottom: "0px",
          left: "100%",
          width: "100%",
          transform: "translateX(-100%)",
          background: "#454545",
          color: "white",
          border: "none",
          padding: "8px",
          fontSize: "14px",
          fontWeight: "600",
          borderRadius: "0px 0px 4px 4px",
        }}
        className="add-property-button"
      >
        + Add Property
      </button>

      {/* connection point on bottom of nodes - outgoing connection */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          //background: "#5cff59",
          background: "white",
          border: "0.5px solid black",
          width: "8px",
          height: "8px",
          borderRadius: "50%",
        }}
      />

      {/* connection point on top of nodes - incoming connection */}
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: "white",
          border: "0.5px solid black",
          width: "8px",
          height: "8px",
          borderRadius: "50%",
        }}
      />

    </div>
  );
};

export default CustomEntityNode;
