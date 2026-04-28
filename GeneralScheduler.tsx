import { Process, AlgorithmType, SimulationResult, SimulationStep, MLFQQueueConfig } from '../types';

export function simulateFCFS(inputProcesses: Process[], contextSwitch: number = 0): SimulationResult {
  const processes: Process[] = inputProcesses.map(p => ({ ...p, remainingTime: p.burstTime, state: 'New' }));
  processes.sort((a, b) => a.arrivalTime - b.arrivalTime);

  let currentTime = 0;
  const steps: SimulationStep[] = [];
  const completed: Process[] = [];
  let lastProcessId: string | null = null;
  
  while (completed.length < processes.length) {
    const available = processes.filter(p => p.arrivalTime <= currentTime && p.state !== 'Terminated');
    
    if (available.length === 0) {
      steps.push({
        time: currentTime,
        runningProcessId: null,
        readyQueue: [],
        waitingQueue: [],
        completedProcesses: completed.map(p => p.id),
        explanation: "CPU is idle. No processes have arrived yet."
      });
      currentTime++;
      continue;
    }

    const p = available[0];
    
    if (lastProcessId !== null && lastProcessId !== p.id && contextSwitch > 0) {
      for (let i = 0; i < contextSwitch; i++) {
        steps.push({
          time: currentTime,
          runningProcessId: null,
          readyQueue: available.map(ap => ap.id),
          waitingQueue: [],
          completedProcesses: completed.map(p => p.id),
          explanation: `Context switching from ${lastProcessId} to ${p.id}...`
        });
        currentTime++;
      }
    }

    if (p.startTime === undefined) {
      p.startTime = currentTime;
      p.responseTime = currentTime - p.arrivalTime;
    }
    
    for (let i = 0; i < p.burstTime; i++) {
      steps.push({
        time: currentTime,
        runningProcessId: p.id,
        readyQueue: available.slice(1).map(ap => ap.id),
        waitingQueue: [],
        completedProcesses: completed.map(p => p.id),
        explanation: `${p.id} is executing. FCFS runs processes in order of arrival.`
      });
      currentTime++;
    }

    p.completionTime = currentTime;
    p.turnaroundTime = p.completionTime - p.arrivalTime;
    p.waitingTime = p.turnaroundTime - p.burstTime;
    p.state = 'Terminated';
    completed.push(p);
    lastProcessId = p.id;
  }

  return calculateMetrics('FCFS', processes, steps);
}

export function simulateSJF(inputProcesses: Process[]): SimulationResult {
  const processes: Process[] = inputProcesses.map(p => ({ ...p, remainingTime: p.burstTime, state: 'New' }));
  let currentTime = 0;
  const steps: SimulationStep[] = [];
  const completed: Process[] = [];

  while (completed.length < processes.length) {
    const available = processes.filter(p => p.arrivalTime <= currentTime && p.state !== 'Terminated');
    
    if (available.length === 0) {
      steps.push({
        time: currentTime,
        runningProcessId: null,
        readyQueue: [],
        waitingQueue: [],
        completedProcesses: completed.map(p => p.id),
        explanation: "CPU is idle. Waiting for processes to arrive."
      });
      currentTime++;
      continue;
    }

    available.sort((a, b) => a.burstTime - b.burstTime || a.arrivalTime - b.arrivalTime);
    const p = available[0];
    
    if (p.startTime === undefined) {
      p.startTime = currentTime;
      p.responseTime = currentTime - p.arrivalTime;
    }

    for (let i = 0; i < p.burstTime; i++) {
      steps.push({
        time: currentTime,
        runningProcessId: p.id,
        readyQueue: available.slice(1).map(ap => ap.id),
        waitingQueue: [],
        completedProcesses: completed.map(p => p.id),
        explanation: `${p.id} selected because it has the shortest burst time (${p.burstTime}).`
      });
      currentTime++;
    }

    p.completionTime = currentTime;
    p.turnaroundTime = p.completionTime - p.arrivalTime;
    p.waitingTime = p.turnaroundTime - p.burstTime;
    p.state = 'Terminated';
    completed.push(p);
  }

  return calculateMetrics('SJF', processes, steps);
}

export function simulateSRTF(inputProcesses: Process[]): SimulationResult {
  const processes: Process[] = inputProcesses.map(p => ({ ...p, remainingTime: p.burstTime, state: 'New' }));
  let currentTime = 0;
  const steps: SimulationStep[] = [];
  const completed: Process[] = [];

  while (completed.length < processes.length) {
    const available = processes.filter(p => p.arrivalTime <= currentTime && p.state !== 'Terminated');
    
    if (available.length === 0) {
      steps.push({
        time: currentTime,
        runningProcessId: null,
        readyQueue: [],
        waitingQueue: [],
        completedProcesses: completed.map(p => p.id),
        explanation: "Idle time."
      });
      currentTime++;
      continue;
    }

    available.sort((a, b) => a.remainingTime - b.remainingTime || a.arrivalTime - b.arrivalTime);
    const p = available[0];
    
    if (p.startTime === undefined) {
      p.startTime = currentTime;
      p.responseTime = currentTime - p.arrivalTime;
    }
    p.state = 'Running';

    steps.push({
      time: currentTime,
      runningProcessId: p.id,
      readyQueue: available.slice(1).map(ap => ap.id),
      waitingQueue: [],
      completedProcesses: completed.map(p => p.id),
      explanation: `${p.id} has the shortest remaining time (${p.remainingTime}). Preemption check occurs every unit.`
    });

    p.remainingTime--;
    currentTime++;

    if (p.remainingTime === 0) {
      p.completionTime = currentTime;
      p.turnaroundTime = p.completionTime - p.arrivalTime;
      p.waitingTime = p.turnaroundTime - p.burstTime;
      p.state = 'Terminated';
      completed.push(p);
    } else {
      p.state = 'Ready';
    }
  }

  return calculateMetrics('SRTF', processes, steps);
}

export function simulatePriority(inputProcesses: Process[], preemptive: boolean): SimulationResult {
  const processes: Process[] = inputProcesses.map(p => ({ ...p, remainingTime: p.burstTime, state: 'New' }));
  let currentTime = 0;
  const steps: SimulationStep[] = [];
  const completed: Process[] = [];

  while (completed.length < processes.length) {
    const available = processes.filter(p => p.arrivalTime <= currentTime && p.state !== 'Terminated');
    
    if (available.length === 0) {
      steps.push({
        time: currentTime,
        runningProcessId: null,
        readyQueue: [],
        waitingQueue: [],
        completedProcesses: completed.map(p => p.id),
        explanation: "Idle."
      });
      currentTime++;
      continue;
    }

    available.sort((a, b) => a.priority - b.priority || a.arrivalTime - b.arrivalTime);
    const p = available[0];
    
    if (p.startTime === undefined) {
      p.startTime = currentTime;
      p.responseTime = currentTime - p.arrivalTime;
    }

    if (preemptive) {
      steps.push({
        time: currentTime,
        runningProcessId: p.id,
        readyQueue: available.slice(1).map(ap => ap.id),
        waitingQueue: [],
        completedProcesses: completed.map(p => p.id),
        explanation: `${p.id} has highest priority (${p.priority}). Preemptive check unit-by-unit.`
      });
      p.remainingTime--;
      currentTime++;
      if (p.remainingTime === 0) {
        p.completionTime = currentTime;
        p.turnaroundTime = p.completionTime - p.arrivalTime;
        p.waitingTime = p.turnaroundTime - p.burstTime;
        p.state = 'Terminated';
        completed.push(p);
      }
    } else {
      for (let i = 0; i < p.burstTime; i++) {
        steps.push({
          time: currentTime,
          runningProcessId: p.id,
          readyQueue: available.slice(1).map(ap => ap.id),
          waitingQueue: [],
          completedProcesses: completed.map(p => p.id),
          explanation: `${p.id} running to completion (Non-preemptive Priority).`
        });
        currentTime++;
      }
      p.completionTime = currentTime;
      p.turnaroundTime = p.completionTime - p.arrivalTime;
      p.waitingTime = p.turnaroundTime - p.burstTime;
      p.state = 'Terminated';
      completed.push(p);
    }
  }

  return calculateMetrics(preemptive ? 'PriorityPreemptive' : 'PriorityNonPreemptive', processes, steps);
}

export function simulateRoundRobin(inputProcesses: Process[], timeQuantum: number = 2): SimulationResult {
  const processes: Process[] = inputProcesses.map(p => ({ ...p, remainingTime: p.burstTime, state: 'New' }));
  let currentTime = 0;
  const steps: SimulationStep[] = [];
  const completed: Process[] = [];
  const queue: Process[] = [];
  
  let lastAddedTime = -1;

  while (completed.length < processes.length) {
    const newlyArrived = processes.filter(p => p.arrivalTime <= currentTime && p.arrivalTime > lastAddedTime && p.state === 'New');
    newlyArrived.forEach(p => {
      p.state = 'Ready';
      queue.push(p);
    });
    lastAddedTime = currentTime;

    if (queue.length === 0) {
      steps.push({
        time: currentTime,
        runningProcessId: null,
        readyQueue: [],
        waitingQueue: [],
        completedProcesses: completed.map(p => p.id),
        explanation: "Idle. No processes in ready queue."
      });
      currentTime++;
      continue;
    }

    const p = queue.shift()!;
    if (p.startTime === undefined) {
      p.startTime = currentTime;
      p.responseTime = currentTime - p.arrivalTime;
    }
    p.state = 'Running';

    const runTime = Math.min(p.remainingTime, timeQuantum);
    for (let i = 0; i < runTime; i++) {
      steps.push({
        time: currentTime,
        runningProcessId: p.id,
        readyQueue: queue.map(qp => qp.id),
        waitingQueue: [],
        completedProcesses: completed.map(p => p.id),
        explanation: `${p.id} is running for quantum unit ${i+1}/${timeQuantum}.`
      });
      currentTime++;
      
      const midArrived = processes.filter(ap => ap.arrivalTime === currentTime && ap.state === 'New');
      midArrived.forEach(ap => {
        ap.state = 'Ready';
        queue.push(ap);
      });
      lastAddedTime = currentTime;
    }

    p.remainingTime -= runTime;

    if (p.remainingTime > 0) {
      p.state = 'Ready';
      queue.push(p);
    } else {
      p.completionTime = currentTime;
      p.turnaroundTime = p.completionTime - p.arrivalTime;
      p.waitingTime = p.turnaroundTime - p.burstTime;
      p.state = 'Terminated';
      completed.push(p);
    }
  }

  return calculateMetrics('RoundRobin', processes, steps);
}

export function simulateMLFQ(
  inputProcesses: Process[], 
  queueConfigs: MLFQQueueConfig[] = [
    { id: 0, quantum: 2 },
    { id: 1, quantum: 4 },
    { id: 2, quantum: 'FCFS' }
  ],
  agingThreshold: number = 20 // Time units before a process is promoted
): SimulationResult {
  const processes: Process[] = inputProcesses.map(p => ({ 
    ...p, 
    remainingTime: p.burstTime, 
    state: 'New',
    queueLevel: 0,
    ioRemainingTime: p.ioBurstTime || 0,
    lastRunTime: p.arrivalTime
  }));
  
  let currentTime = 0;
  const steps: SimulationStep[] = [];
  const completed: Process[] = [];
  const queues: Process[][] = queueConfigs.map(() => []);
  const waitingQueue: Process[] = [];
  
  let lastAddedTime = -1;

  // Max simulation time to prevent infinite loops in case of logic errors
  const MAX_TIME = 1000;

  while (completed.length < processes.length && currentTime < MAX_TIME) {
    // 1. Handle Arrivals
    const newlyArrived = processes.filter(p => p.arrivalTime <= currentTime && p.arrivalTime > lastAddedTime && p.state === 'New');
    newlyArrived.forEach(p => {
      p.state = 'Ready';
      p.queueLevel = 0;
      queues[0].push(p);
    });
    lastAddedTime = currentTime;

    // 2. Handle Aging (Promotion)
    if (agingThreshold > 0) {
      for (let i = 1; i < queues.length; i++) {
        for (let j = 0; j < queues[i].length; j++) {
          const p = queues[i][j];
          if (currentTime - (p.lastRunTime || p.arrivalTime) >= agingThreshold) {
            // Promote
            queues[i].splice(j, 1);
            const oldLevel = p.queueLevel!;
            p.queueLevel = i - 1;
            p.lastRunTime = currentTime;
            queues[i - 1].push(p);
            
            steps.push({
              time: currentTime,
              runningProcessId: null,
              readyQueue: queues.flat().map(qp => qp.id),
              queues: queues.map(q => q.map(qp => qp.id)),
              waitingQueue: waitingQueue.map(wp => wp.id),
              completedProcesses: completed.map(p => p.id),
              explanation: `PROMOTION: ${p.id} moved from Q${oldLevel} to Q${p.queueLevel} due to aging.`,
              transition: {
                processId: p.id,
                from: oldLevel,
                to: p.queueLevel,
                type: 'Promotion'
              }
            });
            
            j--; // Adjust index after splice
          }
        }
      }
    }

    // 3. Handle I/O (Waiting -> Ready)
    for (let i = 0; i < waitingQueue.length; i++) {
      const p = waitingQueue[i];
      p.ioRemainingTime!--;
      if (p.ioRemainingTime! <= 0) {
        waitingQueue.splice(i, 1);
        p.state = 'Ready';
        p.ioRemainingTime = 0;
        const oldLevel = p.queueLevel || 0;
        queues[oldLevel].push(p);
        
        steps.push({
          time: currentTime,
          runningProcessId: null,
          readyQueue: queues.flat().map(qp => qp.id),
          queues: queues.map(q => q.map(qp => qp.id)),
          waitingQueue: waitingQueue.map(wp => wp.id),
          completedProcesses: completed.map(p => p.id),
          explanation: `I/O END: ${p.id} returned to Q${oldLevel}.`,
          transition: {
            processId: p.id,
            from: 'Waiting',
            to: oldLevel,
            type: 'IO_End'
          }
        });
        
        i--;
      }
    }

    // 4. Select Process to Run
    let p: Process | null = null;
    let quantumValue: number = 0;
    let currentQueueIdx = -1;

    for (let i = 0; i < queues.length; i++) {
      if (queues[i].length > 0) {
        p = queues[i].shift()!;
        currentQueueIdx = i;
        const config = queueConfigs[i];
        quantumValue = config.quantum === 'FCFS' ? p.remainingTime : config.quantum;
        break;
      }
    }

    if (!p) {
      steps.push({
        time: currentTime,
        runningProcessId: null,
        readyQueue: queues.flat().map(qp => qp.id),
        queues: queues.map(q => q.map(qp => qp.id)),
        waitingQueue: waitingQueue.map(wp => wp.id),
        completedProcesses: completed.map(p => p.id),
        explanation: waitingQueue.length > 0 ? "CPU Idle. Processes are in I/O wait." : "CPU Idle. No processes ready."
      });
      currentTime++;
      continue;
    }

    // 5. Execute Process
    if (p.startTime === undefined) {
      p.startTime = currentTime;
      p.responseTime = currentTime - p.arrivalTime;
    }
    p.state = 'Running';
    p.lastRunTime = currentTime;

    const runTime = Math.min(p.remainingTime, quantumValue);
    let preempted = false;

    for (let i = 0; i < runTime; i++) {
      steps.push({
        time: currentTime,
        runningProcessId: p.id,
        readyQueue: queues.flat().map(qp => qp.id),
        queues: queues.map((q, idx) => {
          // Include current process in its queue for visualization if needed, 
          // but usually it's "Running"
          return q.map(qp => qp.id);
        }),
        waitingQueue: waitingQueue.map(wp => wp.id),
        completedProcesses: completed.map(p => p.id),
        explanation: `${p.id} running in Q${currentQueueIdx} (${queueConfigs[currentQueueIdx].quantum === 'FCFS' ? 'FCFS' : 'RR' + quantumValue}).`
      });
      
      currentTime++;
      p.remainingTime--;
      p.lastRunTime = currentTime;

      // Check for new arrivals that might preempt
      const midArrived = processes.filter(ap => ap.arrivalTime === currentTime && ap.state === 'New');
      midArrived.forEach(ap => {
        ap.state = 'Ready';
        ap.queueLevel = 0;
        queues[0].push(ap);
      });
      if (midArrived.length > 0) lastAddedTime = currentTime;

      // Preemption check: higher priority queue has processes
      if (currentQueueIdx > 0 && queues.slice(0, currentQueueIdx).some(q => q.length > 0)) {
        if (p.remainingTime > 0) {
          p.state = 'Ready';
          queues[currentQueueIdx].push(p);
          
          steps.push({
            time: currentTime,
            runningProcessId: null,
            readyQueue: queues.flat().map(qp => qp.id),
            queues: queues.map(q => q.map(qp => qp.id)),
            waitingQueue: waitingQueue.map(wp => wp.id),
            completedProcesses: completed.map(p => p.id),
            explanation: `PREEMPTION: ${p.id} preempted by higher priority process.`,
            transition: {
              processId: p.id,
              from: 'CPU',
              to: currentQueueIdx,
              type: 'Preemption'
            }
          });
        }
        preempted = true;
        break;
      }

      if (p.remainingTime === 0) break;
    }

    if (preempted) continue;

    // 6. Post-Execution State Handling
    if (p.remainingTime === 0) {
      p.completionTime = currentTime;
      p.turnaroundTime = p.completionTime - p.arrivalTime;
      p.waitingTime = p.turnaroundTime - p.burstTime;
      p.state = 'Terminated';
      completed.push(p);
      
      steps.push({
        time: currentTime,
        runningProcessId: null,
        readyQueue: queues.flat().map(qp => qp.id),
        queues: queues.map(q => q.map(qp => qp.id)),
        waitingQueue: waitingQueue.map(wp => wp.id),
        completedProcesses: completed.map(p => p.id),
        explanation: `COMPLETED: ${p.id} finished execution.`,
        transition: {
          processId: p.id,
          from: 'CPU',
          to: 'Terminated',
          type: 'Arrival' // Using Arrival as a generic "move" if needed, or just completion
        }
      });
    } else {
      // Check for I/O trigger (simulated: if it used its full quantum, maybe it needs I/O?)
      // Or just demote
      const usedFullQuantum = runTime === quantumValue;
      if (usedFullQuantum) {
        const oldLevel = currentQueueIdx;
        p.state = 'Ready';
        p.queueLevel = Math.min(currentQueueIdx + 1, queues.length - 1);
        queues[p.queueLevel].push(p);
        
        steps.push({
          time: currentTime,
          runningProcessId: null,
          readyQueue: queues.flat().map(qp => qp.id),
          queues: queues.map(q => q.map(qp => qp.id)),
          waitingQueue: waitingQueue.map(wp => wp.id),
          completedProcesses: completed.map(p => p.id),
          explanation: `DEMOTION: ${p.id} moved from Q${oldLevel} to Q${p.queueLevel} (Quantum expired).`,
          transition: {
            processId: p.id,
            from: 'CPU',
            to: p.queueLevel,
            type: 'Demotion'
          }
        });
      } else {
        // It finished its burst or was preempted (handled above)
        // If it didn't use full quantum, it might be I/O bound
        if (p.ioBurstTime && p.ioBurstTime > 0 && Math.random() > 0.5) {
          p.state = 'Waiting';
          p.ioRemainingTime = p.ioBurstTime;
          waitingQueue.push(p);
          
          steps.push({
            time: currentTime,
            runningProcessId: null,
            readyQueue: queues.flat().map(qp => qp.id),
            queues: queues.map(q => q.map(qp => qp.id)),
            waitingQueue: waitingQueue.map(wp => wp.id),
            completedProcesses: completed.map(p => p.id),
            explanation: `I/O START: ${p.id} entering waiting state.`,
            transition: {
              processId: p.id,
              from: 'CPU',
              to: 'Waiting',
              type: 'IO_Start'
            }
          });
        } else {
          p.state = 'Ready';
          queues[currentQueueIdx].push(p);
          
          steps.push({
            time: currentTime,
            runningProcessId: null,
            readyQueue: queues.flat().map(qp => qp.id),
            queues: queues.map(q => q.map(qp => qp.id)),
            waitingQueue: waitingQueue.map(wp => wp.id),
            completedProcesses: completed.map(p => p.id),
            explanation: `READY: ${p.id} returned to Q${currentQueueIdx}.`,
            transition: {
              processId: p.id,
              from: 'CPU',
              to: currentQueueIdx,
              type: 'Arrival'
            }
          });
        }
      }
    }
  }

  return calculateMetrics('MLFQ', processes, steps);
}

function calculateMetrics(algorithm: AlgorithmType, processes: Process[], steps: SimulationStep[]): SimulationResult {
  if (processes.length === 0) {
    return {
      algorithm,
      avgWaitingTime: 0,
      avgTurnaroundTime: 0,
      avgResponseTime: 0,
      cpuUtilization: 0,
      throughput: 0,
      steps: [],
      processes: []
    };
  }
  const totalWaitingTime = processes.reduce((acc, p) => acc + (p.waitingTime || 0), 0);
  const totalTurnaroundTime = processes.reduce((acc, p) => acc + (p.turnaroundTime || 0), 0);
  const totalResponseTime = processes.reduce((acc, p) => acc + (p.responseTime || 0), 0);
  const busyTime = steps.filter(s => s.runningProcessId !== null).length;
  const totalTime = Math.max(1, steps.length);

  return {
    algorithm,
    avgWaitingTime: totalWaitingTime / processes.length,
    avgTurnaroundTime: totalTurnaroundTime / processes.length,
    avgResponseTime: totalResponseTime / processes.length,
    cpuUtilization: (busyTime / totalTime) * 100,
    throughput: processes.length / totalTime,
    steps,
    processes
  };
}

