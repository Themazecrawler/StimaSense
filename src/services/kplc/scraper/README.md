KPLC Planned Outage Scraper

Source: `https://kplc.co.ke/customer-support#powerschedule`

Run every 12 hours via cron (e.g., cronjob.org) to fetch and publish normalized JSON for the mobile app.

Output schema (array of records):

```
{
  id: string,                 // Stable ID per posting
  region: string,             // County/region
  area: string,               // Specific estates/roads/feeders
  startTime: string,          // ISO 8601
  endTime: string,            // ISO 8601
  sourceUrl: string,          // Original page/post URL
  createdAt: string           // ISO when posted (or fetched time)
}
```

Deploy options:
- Publish JSON to a public URL (e.g., GitHub Pages, S3, Firebase Hosting)
- Or host a tiny API that returns the latest JSON

App config:
- Point `KPLCPlannedOutageService.initialize(remoteUrl)` to that JSON URL.

