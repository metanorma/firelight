export interface Progress {
  state?: string | undefined;
  total?: number | undefined;
  done?: number | undefined;
}

export type TaskProgressCallbackReturnValue = [
  /** Call to update created task with more progress, or null for completion. */
  handleSubsequentProgress: (progress: Progress | null) => void,
  /** Call to initiate a subtask. */
  handleSubtask: TaskProgressCallback,
  /** Call to report a problem. */
  handleNotice: TaskNoticeCallback,
];


export type TaskNoticeCallback = (
  msg: string,
  severity?: 'info' | 'warning' | 'error',
) => void;

export type TaskProgressCallback = (
  /** Task name, possibly slash-separated for nested tasks. */
  taskRef: string,
  /** Current progress to report. */
  progress?: Progress | null,
) => TaskProgressCallbackReturnValue;
