import React, { useState } from "react";
import { Handle, Position } from "@xyflow/react";

const CustomEntityNode = ({ id, data, isConnectable }) => {
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
                <span>
                  {prop.name} <span style={{ fontSize: "14px", fontStyle: "italic", color: "gray" }}>({prop.type})</span>
                </span>

                <button
                  onClick={() => data.onDeleteProperty(id, index)}
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

      <Handle type="source" position={Position.Right} />
      <Handle type="target" position={Position.Left} />
    </div>
  );
};

export default CustomEntityNode;
