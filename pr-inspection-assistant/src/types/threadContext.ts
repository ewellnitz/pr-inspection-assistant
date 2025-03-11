import { ThreadContextFilePosition } from "./threadContextFilePosition";

export interface ThreadContext {
    filePath: string;
    leftFileStart?: ThreadContextFilePosition;
    leftFileEnd?: ThreadContextFilePosition;
    rightFileStart?: ThreadContextFilePosition;
    rightFileEnd?: ThreadContextFilePosition;
}