/**
 * Lua prelude, part 2: the TTS API shim, Lua side [ID: LOGIC-TABLETOP-LUA-PRELUDE-API]
 *
 * Object, `Player`, `Turns` and `Notes` proxies that forward to the host dispatcher
 * (`luaShim.ts`) through `host(op, …)`; `getVar`/`setVar`/`call` between script environments;
 * events and button clicks routed to the scripts that define them. Known TTS globals the shim
 * does not cover answer `nil` and are reported once (`unshimmed`), they never throw.
 * Follows `luaPreludeCore.ts` in the same chunk (`LUA_PRELUDE`).
 */

export const LUA_PRELUDE_API = String.raw`
local proxies = {}
local GLOBAL = "-1"
local proxy
local function unwrap(v, depth)
  depth = depth or 0
  if type_(v) ~= "table" or depth > 12 then
    if type_(v) == "function" then return nil end
    return v
  end
  local guid = rawget(v, "__guid")
  if guid then return { __obj = guid } end
  local out = {}
  for k, item in pairs_(v) do out[k] = unwrap(item, depth + 1) end
  return out
end
local function wrap(v, depth)
  depth = depth or 0
  if type_(v) ~= "table" or depth > 12 then return v end
  if v.__obj then return proxy(v.__obj) end
  for k, item in pairs_(v) do v[k] = wrap(item, depth + 1) end
  return v
end
local function call_host(op, ...)
  local args = pack_(...)
  for i = 1, args.n do args[i] = unwrap(args[i]) end
  return wrap(host(op, unpack_(args, 1, args.n)))
end
local reported = {}
local function unshimmed(name)
  if not reported[name] then reported[name] = true; host("unshimmed", name) end
end

-- methods kept in Lua: they read other script environments, never the table
local lua_methods = {
  getGUID = function(g) return g end,
  getVar = function(g, name) local env = envs[g]; return env and rawget(env, name) end,
  setVar = function(g, name, value) local env = envs[g]; if env then rawset(env, name, value) end end,
  getTable = function(g, name) local env = envs[g]; return env and rawget(env, name) end,
  setTable = function(g, name, value) local env = envs[g]; if env then rawset(env, name, value) end end,
  call = function(g, name, params)
    local env = envs[g]
    local fn = env and rawget(env, name)
    if type_(fn) ~= "function" then return nil end
    return fn(params)
  end,
}
local host_methods = {}
for name in string.gmatch(__LUA_HOST_METHODS, "%S+") do host_methods[name] = true end
local fields = { guid = true, tag = true, type = true, name = true, is_face_down = true }

local object_meta = {
  __index = function(self, key)
    local g = rawget(self, "__guid")
    if fields[key] then
      if key == "guid" then return g end
      return call_host("obj", g, "field:" .. key)
    end
    local m = lua_methods[key]
    local is_host = host_methods[key]
    return function(a, ...)
      -- obj.f(x) and obj:f(x) both work
      local args = pack_(...)
      if a ~= self then args = pack_(a, ...) end
      if m then return m(g, unpack_(args, 1, args.n)) end
      if not is_host then unshimmed("Object." .. key); return nil end
      local params = args[1]
      local r = call_host("obj", g, key, unpack_(args, 1, args.n))
      if type_(params) == "table" and type_(params.callback_function) == "function" and r ~= nil then
        local cb = params.callback_function
        api.Wait.frames(function() cb(r) end, 1)
      end
      return r
    end
  end,
  __tostring = function(self) return "Object(" .. rawget(self, "__guid") .. ")" end,
}
proxy = function(guid)
  local p = proxies[guid]
  if not p then p = setmeta({ __guid = guid }, object_meta); proxies[guid] = p end
  return p
end
api.Global = proxy(GLOBAL)
env_init = function(env, owner) env.self = proxy(owner) end
api.getObjectFromGUID = function(guid)
  if guid == GLOBAL then return api.Global end
  if call_host("exists", guid) then return proxy(guid) end
  return nil
end
api.getAllObjects = function() return call_host("all") end
api.getObjects = api.getAllObjects
api.getObjectsWithTag = function(tag) return call_host("tagged", tag) end
api.getSeatedPlayers = function() return call_host("seated") end
api.broadcastToAll = function(msg, color) host("print", tostring_(msg), unwrap(color), "all") end
api.printToAll = function(msg, color) host("print", tostring_(msg), unwrap(color), "all") end
api.printToColor = function(msg, player, color) host("print", tostring_(msg), unwrap(color), player) end
api.broadcastToColor = api.printToColor
api.print = function(...)
  local parts = pack_(...)
  for i = 1, parts.n do parts[i] = tostring_(parts[i]) end
  host("print", concat_(parts, " ", 1, parts.n), nil, "host")
end
api.log = function(v) api.print(v) end
api.JSON = {
  encode = function(v) return host("json_encode", unwrap(v)) end,
  encode_pretty = function(v) return host("json_encode", unwrap(v), true) end,
  decode = function(s) return host("json_decode", tostring_(s)) end,
}

local player_methods = {}
for name in string.gmatch(__LUA_PLAYER_METHODS, "%S+") do player_methods[name] = true end
local function player(color)
  return setmeta({ color = color }, { __index = function(self, key)
    if key == "seated" or key == "steam_name" or key == "admin" or key == "host" then
      return call_host("player", color, "field:" .. key)
    end
    return function(a, ...)
      local args = pack_(...)
      if a ~= self then args = pack_(a, ...) end
      if not player_methods[key] then unshimmed("Player." .. key); return nil end
      return call_host("player", color, key, unpack_(args, 1, args.n))
    end
  end })
end
api.Player = setmeta({
  getPlayers = function()
    local out = {}
    for i, c in ipairs_(call_host("seated")) do out[i] = player(c) end
    return out
  end,
  getColors = function() return call_host("colors") end,
}, { __index = function(_, color) return player(color) end })

api.Turns = setmeta({
  getNextTurnColor = function() return call_host("turns", "next") end,
  getPreviousTurnColor = function() return call_host("turns", "previous") end,
}, {
  __index = function(_, key) return call_host("turns", "get:" .. key) end,
  __newindex = function(_, key, value) call_host("turns", "set:" .. key, value) end,
})
api.Notes = {
  getNotes = function() return call_host("notes", "get") end,
  setNotes = function(s) return call_host("notes", "set", tostring_(s)) end,
  addNotebookTab = function(p) return call_host("notes", "add", p) end,
}

-- known TTS globals without a shim: nil plus one report, never an error
local function stub(name)
  return setmeta({}, { __index = function(_, key)
    return function() unshimmed(name .. "." .. key) end
  end, __call = function() unshimmed(name) end })
end
for name in string.gmatch(__LUA_STUB_LIBS, "%S+") do api[name] = stub(name) end
for name in string.gmatch(__LUA_STUB_FUNCTIONS, "%S+") do
  api[name] = function() unshimmed(name) end
end

-- host entries
local function each_handler(name, owner_only, ...)
  for _, owner in ipairs_(env_order) do
    if not owner_only or owner == owner_only then
      local fn = rawget(envs[owner], name)
      if type_(fn) == "function" then guarded(owner .. "." .. name, fn, ...) end
    end
  end
end
function __rt_start(states, seed)
  math.randomseed(seed or 0)
  -- TTS order: object scripts first, Global last
  for _, owner in ipairs_(env_order) do
    if owner ~= GLOBAL then
      local fn = rawget(envs[owner], "onLoad")
      if type_(fn) == "function" then guarded(owner .. ".onLoad", fn, states[owner] or "") end
    end
  end
  local g = envs[GLOBAL]
  if g then
    local fn = rawget(g, "onLoad")
    if type_(fn) == "function" then guarded("Global.onLoad", fn, states[GLOBAL] or "") end
  end
end
function __rt_event(name, args, owner_only)
  local a = wrap(args or {})
  each_handler(name, owner_only, unpack_(a, 1, #a))
end
function __rt_turn(color, previous)
  each_handler("onPlayerTurn", nil, player(color), previous and player(previous) or nil)
end
function __rt_click(owner, fn_name, target, color)
  local env = envs[owner]
  local fn = env and rawget(env, fn_name)
  if type_(fn) ~= "function" then unshimmed("click_function " .. tostring_(fn_name)); return end
  guarded(owner .. "." .. fn_name, fn, proxy(target), color, false)
end
function __rt_save()
  local out = {}
  for _, owner in ipairs_(env_order) do
    local fn = rawget(envs[owner], "onSave")
    if type_(fn) == "function" then
      local ok, s = guarded(owner .. ".onSave", fn)
      if ok and type_(s) == "string" then out[owner] = s end
    end
  end
  return out
end
`;
