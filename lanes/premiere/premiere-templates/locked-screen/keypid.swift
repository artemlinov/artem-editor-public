// keypid <pid> <keycode> pid|session: post one key (36 = Return) to a pid, dismisses a native modal under a locked screen; premiere-dismiss.sh compiles it (README.md).
import Cocoa
let pid = pid_t(CommandLine.arguments[1])!
let code = CGKeyCode(UInt16(CommandLine.arguments[2])!)
let mode = CommandLine.arguments[3]
for down in [true, false] {
  let e = CGEvent(keyboardEventSource: nil, virtualKey: code, keyDown: down)!
  if mode == "pid" { e.postToPid(pid) } else { e.post(tap: .cgSessionEventTap) }
  usleep(50000)
}
print("posted", mode)
