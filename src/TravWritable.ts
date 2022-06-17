import internal, { Writable } from "stream";

interface TravWritableOptions<T> extends internal.WritableOptions{
    handler?:HandlerMethod<T>,
    enqueue?:ChunkEnqueueMethod<T>
}



const kChunkQueue = Symbol("Chunk Queue")
const kHandler = Symbol("Handler")
const kChunkCallback = Symbol("Chunk Callback")
const kAppendMode = Symbol("Append Mode")
type ChunkEnqueueMethod<T> = (this:TravWritable<T>, chunk:T|T[]) => void
type HandlerMethod<T> = (this:TravWritable<T>, current:T)=>void;
export default class TravWritable<T=string> extends Writable{
    /**
     * 
     * @param chunk The chunk written to the stream
     * 
     * Takes the target type, or arrays of the target type, and enqueues them   
     * The queue acts as a cache, it enables peeking   
     * This method can be overrided for your own purposes.    
     * The default implementation is written for strings   
     * @warn
     * **Please override this method if you are not using strings/files** 
     */
    protected enqueue(chunk:T|T[]|Buffer){
        //@ts-expect-error
        
        if(Buffer.isBuffer(chunk))chunk=chunk.toString().split("")
        //@ts-expect-error
        if(!Array.isArray(chunk))chunk = [chunk]
        //@ts-expect-error
        for(let item of chunk){
            
            this.push(item)
        }

    }
    /**
     * 
     * @param _chunk A single item of type T
     * 
     * The equivalent of `Writable._write()`   
     * The `handler` method is called for every chunk in the stream   
     * if the `next()` method is called within the handler, it will skip the appropriate number of chunks on the next iteration   
     * 
     * 
     * @warn This method is required/must be overrided
     */
    protected async handler(_chunk:T){
        throw new Error("No Handler Provided")
    }
    private [kChunkCallback]:(()=>void)|null = null
    private [kChunkQueue]:any[] = []
    /**
     * If append mode is enabled, data should be appended to the queue without triggering the handler
     */
    private [kAppendMode]:boolean = false;
    public finished:boolean = false;

    constructor(options?:TravWritableOptions<T>){
        if(options)options.autoDestroy = false
        super(options)
        if(options?.enqueue)this.enqueue = options.enqueue
        //@ts-expect-error
        if(options?.handler)this.handler = options.handler

    }

    private dequeue():T|null{
        const returns = this[kChunkQueue].shift()
        if(returns)return returns
        
        return this[kChunkQueue].shift()||null
    }
    /**
     * Pushes an item to the back of the internal queue   
     * The Queue represents the items in the stream that have yet to been processed
     */
    protected push(data:T){
        //// @ts-expect-error
        // stdout.write(data)
        this[kChunkQueue].push(data)
    }
    /**
     * 
     * @param count The number of items ahead to skip to (default=1)
     * @returns Either the appropriate token, or null if the stream is finished
     */
    public next(count:number=1){
        return new Promise<T|null>( (res) => {
            if(this[kChunkQueue].length >= count){
                for(let i = 0;i<count-1;i++)this.dequeue()
                res(this.dequeue())
            }
            else{
                
                if(!this[kChunkCallback])res(null)
                this[kAppendMode] = true
                this.once("finish", () => {
                    
                    this[kAppendMode]=false
                    res(null)
                })
                this.once("write", ()=> {
                    
                    res(this.next(count))
                    
                })
                
                this[kChunkCallback]!()
                this[kChunkCallback]=null
            }

            
            
        } )
        
    }
    /**
     * 
     * @param count The number of items to peek ahead to (default=1)
     * @returns Either the appropriate token, or null if the stream is finished
     * 
     * 
     * @warn Don't peek a ridiculous quantity of items ahead, as it preloads chunks
     */
    public peek(count:number=1){
        return new Promise<T|null>(async (res) => {
            const beforeState = [...this[kChunkQueue]]
            const peek = await this.next(count)
            this[kChunkQueue] = beforeState
            res(peek)
            
        })
    }

    override async _write(chunk: any, _encoding: BufferEncoding, callback: (error?: Error | null | undefined) => void){
        
        let hasCalledBack = false
        const cb = ()=>{
            
            if(!hasCalledBack){
                hasCalledBack=true
                callback(null)                
            }
        }
        this[kChunkCallback]=cb;
        this.enqueue(chunk)
        // allow the next method to discover new chunks
        this.emit("write")
        if(!this[kAppendMode])
        await this[kHandler]()
        
        // if it has already been called, dont bother
        cb()
    }
    override async _final(callback: (error?: Error | null | undefined) => void){
        this.finished=true;
        callback()
    }
    /**
     * 
     * @internal
     */
    async [kHandler](){
        
        let current = this.dequeue()
        while(current){
            
            await this.handler(current)
            current = await this.next()
        }
        this.destroy()
    }
}