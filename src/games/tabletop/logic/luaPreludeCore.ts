/**
 * Lua prelude, part 1: sandbox, budget, script loader, Wait [ID: LOGIC-TABLETOP-LUA-PRELUDE-CORE]
 *
 * Runs once in a fresh VM before any Workshop script (ADR-0005 decision 2). It takes the single
 * host function `__host` into a local and removes it, strips everything outside the whitelist
 * (`string`, `table`, `math`, `coroutine`, `utf8`, base functions; no `io`, `os`, `require`,
 * `load`, `debug`, `string.dump`), and arms a `debug.sethook` instruction budget on every entry
 * from the host and on every coroutine. Each script gets its own environment (TTS: one script
 * per object plus Global) whose `__index` is the shared, read-only API base.
 *
 * Joined with `luaPreludeApi.ts` into one chunk (`LUA_PRELUDE`), so both parts share locals.
 */

/** Hook calls (each `LUA_HOOK_STEP` instructions) one host entry may use. */
export const LUA_HOOK_STEP = 1000;
export const DEFAULT_LUA_BUDGET = 2_000_000;

export const LUA_PRELUDE_CORE = String.raw`
local host = __host
__host = nil
local sethook = debug.sethook
local load_, pcall_, xpcall_, error_, type_, tostring_ = load, pcall, xpcall, error, type, tostring
local pairs_, ipairs_, setmeta, getmeta, select_ = pairs, ipairs, setmetatable, getmetatable, select
local unpack_, pack_, sort_, concat_ = table.unpack, table.pack, table.sort, table.concat
local co_create, co_resume, co_status = coroutine.create, coroutine.resume, coroutine.status
local STEP = __LUA_HOOK_STEP
local limit = __LUA_BUDGET // STEP
local count = 0
local function hook()
  count = count + 1
  if count > limit then error_("instruction budget exceeded", 0) end
end
local function arm() count = 0; sethook(hook, "", STEP) end
local function report_error(where, err) host("error", where .. ": " .. tostring_(err)) end
local function guarded(where, fn, ...)
  arm()
  local r = pack_(xpcall_(fn, function(e) return tostring_(e) end, ...))
  if not r[1] then report_error(where, r[2]); return false end
  return true, unpack_(r, 2, r.n)
end

-- whitelist: drop everything else from the real globals
local keep = { string = true, table = true, math = true, coroutine = true, utf8 = true,
  assert = true, error = true, ipairs = true, next = true, pairs = true, pcall = true,
  rawequal = true, rawget = true, rawlen = true, rawset = true, select = true,
  setmetatable = true, getmetatable = true, tonumber = true, tostring = true, type = true,
  xpcall = true, _G = true, _VERSION = true }
for k in pairs_(_G) do if not keep[k] then _G[k] = nil end end
string.dump = nil
local rep = string.rep
string.rep = function(s, n, sep)
  if (#s + #(sep or "")) * (n or 0) > 4194304 then error_("string.rep result too large", 2) end
  return rep(s, n, sep)
end
coroutine.create = function(fn)
  local co = co_create(fn)
  sethook(co, hook, "", STEP)
  return co
end
coroutine.wrap = function(fn)
  local co = coroutine.create(fn)
  return function(...)
    local r = pack_(co_resume(co, ...))
    if not r[1] then error_(r[2], 0) end
    return unpack_(r, 2, r.n)
  end
end

-- the API base every script environment reads through; filled by the API part
local api = {}
for k in pairs_(keep) do api[k] = _G[k] end
api._G = nil
api.unpack = unpack_
local envs, env_order = {}, {}
local env_init
local function script_env(owner)
  local env = setmeta({}, { __index = api })
  env._G = env
  if env_init then env_init(env, owner) end
  return env
end

-- Wait.* and startLuaCoroutine run on the host tick (__rt_tick)
local waits, next_wait, clock, frame = {}, 1, 0, 0
local function add_wait(w) local id = next_wait; next_wait = id + 1; waits[id] = w; return id end
api.Wait = {
  time = function(fn, seconds, reps)
    local s = math.max(0, tonumber(seconds) or 0)
    return add_wait({ fn = fn, at = clock + s, every = s, reps = reps or 1 })
  end,
  frames = function(fn, n) return add_wait({ fn = fn, frame = frame + math.max(1, n or 1) }) end,
  condition = function(fn, cond, timeout, on_timeout)
    return add_wait({ fn = fn, cond = cond, until_ = timeout and clock + timeout, on_timeout = on_timeout })
  end,
  stop = function(id) waits[id] = nil end,
  stopAll = function() waits = {} end,
}
local coroutines = {}
api.startLuaCoroutine = function(owner, name)
  local env = envs[owner and rawget(owner, "__guid") or "-1"] or envs["-1"]
  local fn = env and rawget(env, name)
  if type_(fn) ~= "function" then return false end
  coroutines[#coroutines + 1] = coroutine.create(fn)
  return true
end
local function run_waits()
  local ids = {}
  for id in pairs_(waits) do ids[#ids + 1] = id end
  sort_(ids)
  for _, id in ipairs_(ids) do
    local w = waits[id]
    if w then
      if w.cond then
        local ok, met = guarded("Wait.condition", w.cond)
        if not ok then waits[id] = nil
        elseif met then waits[id] = nil; guarded("Wait.condition", w.fn)
        elseif w.until_ and clock >= w.until_ then
          waits[id] = nil
          if w.on_timeout then guarded("Wait.condition", w.on_timeout) end
        end
      elseif w.frame then
        if frame >= w.frame then waits[id] = nil; guarded("Wait.frames", w.fn) end
      elseif clock >= w.at then
        if w.reps == 1 then waits[id] = nil else
          w.reps = w.reps - 1
          w.at = clock + w.every
        end
        guarded("Wait.time", w.fn)
      end
    end
  end
  local live = {}
  for _, co in ipairs_(coroutines) do
    arm()
    local ok, err = co_resume(co)
    if not ok then report_error("coroutine", err)
    elseif co_status(co) ~= "dead" then live[#live + 1] = co end
  end
  coroutines = live
end

function __rt_tick(dt)
  clock = clock + math.max(0, tonumber(dt) or 0)
  frame = frame + 1
  run_waits()
end

function __rt_load(owner, source)
  local env = script_env(owner)
  local chunk, err = load_(source, "=" .. owner, "t", env)
  if not chunk then report_error("load " .. owner, err); return false end
  envs[owner] = env
  env_order[#env_order + 1] = owner
  return (guarded("run " .. owner, chunk))
end
`;
