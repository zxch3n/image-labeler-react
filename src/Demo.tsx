import React from "react";
import ReactDOM from "react-dom";
import {Annotator} from './Annotator';

ReactDOM.render(
  <div>
      <Annotator 
        height={600} 
        width={600} 
        imageUrl={""} 
        asyncUpload={async (labeledData)=>{
            // upload labeled data
        }} 
        types={['A', 'B', 'Cylinder']}
        defaultType={"Cylinder"}
        sceneTypes={['1', '2', '3']}
        style={{
          width: 640,
          height: 680,
          margin: "20px auto",
          position: "relative",
          backgroundColor: "#368",
          borderRadius: 8,
          padding: 10
        }}/>
  </div>,
  document.body
);

module.hot.accept();