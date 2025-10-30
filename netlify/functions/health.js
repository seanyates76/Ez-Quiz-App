exports.handler = async () => ({
  statusCode:200,
  headers:{ "Content-Type":"application/json" },
  body: JSON.stringify({ status:"ok", ts:Date.now(), node:process.version })
});