export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  res.setHeader('Service-Worker-Allowed', '/');
  res.status(200).send(`self.options = {
    "domain": "5gvci.com",
    "zoneId": 11967864
}
self.lary = ""
importScripts('https://5gvci.com/act/files/service-worker.min.js?r=sw')
`);
}
