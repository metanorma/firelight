import React, { useState, useEffect } from 'react';
import { produce } from 'immer'
import { Text, Box, Static } from 'ink';
import { Badge, ProgressBar, Spinner, StatusMessage } from '@inkjs/ui';
import { type Progress, type TaskProgressCallback, type TaskProgressCallbackReturnValue } from 'anafero/progress.mjs';


interface ProcessorProps {
  //revisions: string[];
  //omitRevisionsNewerThanCurrent: boolean;
  //currentRevision: boolean;

  rootTaskName: string;
  onStart: (opts: { onProgress: TaskProgressCallback }) => Promise<void>;
}

export const Processor: React.FC<ProcessorProps> = function({ rootTaskName, onStart }) {
  const [tasks, setTasks] = useState<Tasks>({
    [rootTaskName]: {
      progress: { state: 'working…' },
    },
  });

  const [notices, setNotices] =
    useState<{ msg: string, severity: 'info' | 'warning' | 'error' }[]>([]);

  useEffect(() => {
    onStart({ onProgress: handleProgress });
  }, []);

  function updateTask(taskPath: string, progress: Progress | null) {
    const taskPathComponents = taskPath.split('|');
    const taskName = taskPathComponents.pop()!;
    setTasks(tasks => produce(tasks, tasksDraft => {
      let cursor = tasksDraft;
      while (taskPathComponents.length > 0) {
        const nextComponent = taskPathComponents.shift()!;
        cursor[nextComponent] ??= {};
        cursor[nextComponent].subtasks ??= {};
        cursor = cursor[nextComponent].subtasks;
      }
      cursor[taskName] ??= {};
      if (progress) {
        //if (cursor[taskName]?.progress?.done && !progress.done) {
        //  console.debug("updating state without done");
        //}
        cursor[taskName].progress = {
          ...(cursor[taskName].progress ?? {}),
          ...progress,
        };
      } else {
        delete cursor[taskName].progress;
        //delete cursor[taskName];
      }
      return tasksDraft;
    }));
  }

  function handleProgress(taskPath: string, progress?: Progress | null): TaskProgressCallbackReturnValue {
    updateTask(taskPath, progress === undefined ? {} : progress);
    return [
      function handleSubsequentTaskProgress(progress: Progress | null) {
        updateTask(taskPath, progress);
      },
      function handleSubtask(subtaskRef: string, progress: Progress | null) {
        return handleProgress(`${taskPath}|${subtaskRef}`, progress);
      },
      function handleNotice(msg: string, severity = 'info') {
        setNotices(notices => [...notices, { msg, severity }]);
      },
    ] as TaskProgressCallbackReturnValue;
  }

  return (
    <>
      <Static items={notices}>
        {(notice, idx) => <Box key={idx} gap={2}>
          <Badge color={notice.severity === 'error'
              ? 'red'
              : notice.severity === 'warning'
                ? 'yellow'
                : 'blue'}>
            {notice.severity}
          </Badge>
          <Text>
            {notice.msg}
          </Text>
        </Box>}
      </Static>
      <Box flexDirection="column">
        <Tasks tasks={tasks} />
      </Box>
    </>
  );
}

//function mutateNested(obj: Record<string, unknown>, newValue: unknown, path: string, sep='/') {
//
//  const stack = path.split(sep);
//  let handle = obj;
//
//  while (stack.length > 1) {
//    handle = handle[stack.shift()!] as Record<string, unknown>;
//  }
//
//  handle[stack.shift()!] = newValue;
//}

interface Tasks {
  [task: string]: Task;
}
interface Task {
  progress?: Progress;
  error?: string;
  subtasks?: Tasks;
}

const LATEST_TASKS_TO_SHOW = 5;
const Tasks: React.FC<{ tasks: Tasks }> = function ({ tasks }) {
  const numTasks = Object.keys(tasks).length;
  const taskEntries = numTasks > LATEST_TASKS_TO_SHOW
    ? Object.entries(tasks).slice(numTasks - LATEST_TASKS_TO_SHOW - 1, numTasks - 1)
    : Object.entries(tasks);
  return (
    <>
      {taskEntries.map(([task, props]) =>
        <TaskTree key={task} task={task} {...props} />
      )}
    </>
  );
};

const TaskTree: React.FC<{ task: string } & Task> =
function ({ task, progress, error, subtasks }) {
  const hasProgressEstimate = progress && progress.total !== undefined && progress.done !== undefined;
  return (
    <Box flexDirection="column">
      <Box height={hasProgressEstimate ? 2 : 1} flexDirection="column">
        {progress
          ? <>
              <Box height={1} gap={2} flexGrow={0}>
                <Spinner label={task} />
                <Box flexGrow={0}>
                  <Text>{progress.state ?? 'working…'}</Text>
                </Box>
              </Box>
              <Box height={1} flexGrow={0}>
                {hasProgressEstimate
                  ? <ProgressBar value={100 / progress.total! * progress.done!} />
                  : null}
              </Box>
            </>
          : error
            ? <StatusMessage variant="error">{task}: {error}</StatusMessage>
            : <StatusMessage variant="success">{task}</StatusMessage>}
      </Box>
      {Object.keys(subtasks ?? []).length > 0
        ? <Box marginLeft={2} flexDirection="column">
            <Tasks tasks={subtasks!} />
          </Box>
        : null}
    </Box>
  );
}
