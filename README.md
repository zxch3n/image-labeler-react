# Image Labeler ( Bounding Box Annotation Tool )

A react component that helps labeling images. Support scaling images by mouse wheel and pinch gesture.

[![screenshot.png](https://i.postimg.cc/cJrdb8Sx/screenshot.png)](https://postimg.cc/t1G01JJw)

[![labeler.gif](https://i.postimg.cc/L4rMYRxQ/labeler.gif)](https://postimg.cc/F1g6wt50)

# Usage

```bash
npm install image-labeler-react
```

```js
import React from 'react';
import {Annotator} from 'image-labeler-react';

const App: React.FC = () => {
  return (
    <div className="App">
      <Annotator 
        height={600} width={600} 
        imageUrl={""} asyncUpload={async (labeledData)=>{
            // upload labeled data
        }} 
        types={['A', 'B', 'Cylinder']}
        defaultType={"Cylinder"} />
    </div>
  );
}

export default App;
```





