export interface Progress {
  state?: string;
  total?: number;
  done?: number;
}

export type TaskProgressCallbackReturnValue = [
  handleSubsequentProgress: (progress: Progress | null) => void,
  handleSubtask: TaskProgressCallback,
];

export type TaskProgressCallback = (
  /** Task name, possibly slash-separated for nested tasks. */
  taskRef: string,
  /** Current progress to report. */
  progress?: Progress | null,
) => TaskProgressCallbackReturnValue;
