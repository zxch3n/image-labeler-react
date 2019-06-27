import React from "react";
import ReactDOM from "react-dom";
import {Annotator} from './Annotator';

ReactDOM.render(
  <div>
      <Annotator 
        height={600} 
        width={600} 
        imageUrl={"https://i.postimg.cc/cJrdb8Sx/screenshot.png"} 
        asyncUpload={async (labeledData)=>{
            // upload labeled data
            console.log(labeledData);
        }} 
        types={['A', 'B', 'Cylinder']}
        defaultType={"Cylinder"}
        sceneTypes={['1', '2', '3']}
        defaultSceneType={'3'}
        style={{
          width: 640,
          height: 680,
          margin: "20px auto",
          position: "relative",
          backgroundColor: "#368",
          borderRadius: 8,
          padding: 10
        }}
        defaultBoxes={[{
          x: 316,
          y: 305,
          w: 65,
          h: 61,
          annotation: 'A'
        }]}
        disableAnnotation={false}
        />
  </div>,
  document.body
);

module.hot.accept();