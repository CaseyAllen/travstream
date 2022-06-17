# ***Travstream***

### A Traversable Writable Stream that abstracts away chunk borders


## **Usage**


### A Simple Smiley Face Transformer
```js
const Traversable = require("travstream")
const fs = require("fs")

// loremipsum.txt is a file that contains `:)` anywhere
const file = fs.createReadStream("loremipsum.txt")

let newData = ""

const st = new Traversable({
    handler: async function(chunk){
        // get the next chunk
        const nextChunk = await this.peek()

        // look for smiley faces
        if(chunk === ":" && nextChunk === ")"){
            // use the emoji
            newData+="🙂"

            // skip the next character so that the next iteration won't be the ')'
            await this.next()
        }else{
            newData+=chunk
        }
    }
})

// The Travsesable emits the same events as a writable stream
st.on("close", ()=>{
    console.log(newData)
})

// pipe the contents of the file into the stream
file.pipe(st)
```