import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWindowsRenameScript,
  createAdNameFields,
  downloadNewAdFile,
  downloadNewAdFiles,
  downloadWindowsRenameScript,
  filterNewAds,
  getAdRenameScriptFilename,
  generateToppyAdId,
  getAdDownloadFilename,
  getGoogleDriveDownloadUrl,
  parseNewAdsCsv,
  selectFilteredNewAds
} from "../src/new-ads.js";

test("parseNewAdsCsv maps linked rows and generates missing IDs", () => {
  const csv = [
    "Mission,Language🌍💬 ,Script / Topic,Creative ID,Image?,Rating,Status,Final Video Link",
    "Denver,English,Come to Church,Mar26-100,TRUE,4,Available for Use,https://drive.google.com/file/d/abc/view",
    "Boise,Spanish,Faith,,FALSE,5,Rating Pending,https://drive.google.com/file/d/def/view",
    "Provo,English,Prayer,May26-100,FALSE,5,Available for Use,"
  ].join("\n");

  const ads = parseNewAdsCsv(csv, {
    month: "2026-03",
    monthLabel: "March 2026",
    idFactory: () => "TPY-GENERATED"
  });

  assert.equal(ads.length, 2);
  assert.equal(ads[0].id, "Mar26-100");
  assert.equal(ads[0].format, "Image");
  assert.equal(ads[1].id, "TPY-GENERATED");
  assert.equal(ads[1].generatedId, true);
});

test("parseNewAdsCsv accepts uploaded data with a plain Language column", () => {
  const csv = [
    "Mission,Language,Script / Topic,Creative ID,Image?,Rating,Status,Final Video Link",
    "Denver,English,Come to Church,Upload-100,FALSE,4,Available for Use,https://drive.google.com/file/d/abc/view"
  ].join("\n");

  const ads = parseNewAdsCsv(csv, {
    month: "upload-1",
    monthLabel: "My Upload"
  });

  assert.equal(ads.length, 1);
  assert.equal(ads[0].language, "English");
  assert.equal(ads[0].monthLabel, "My Upload");
});

test("parseNewAdsCsv skips Drive folders and uses the next valid file link", () => {
  const csv = [
    "Mission,Creative ID,Final Video Link,Edited by FSC Link",
    "Denver,Mar26-100,https://drive.google.com/drive/folders/folder123,https://drive.google.com/file/d/video123/view",
    "Boise,Mar26-101,https://drive.google.com/drive/folders/folder456,"
  ].join("\n");

  const ads = parseNewAdsCsv(csv, {
    month: "2026-03",
    monthLabel: "March 2026"
  });

  assert.equal(ads.length, 1);
  assert.equal(
    ads[0].videoUrl,
    "https://drive.google.com/file/d/video123/view"
  );
});

test("filterNewAds combines language, month, rating, format, and status", () => {
  const ads = [
    {
      language: "English",
      month: "2026-03",
      rating: 4,
      format: "Video",
      status: "Available for Use"
    },
    {
      language: "English",
      month: "2026-03",
      rating: 2,
      format: "Video",
      status: "Available for Use"
    },
    {
      language: "Spanish",
      month: "2026-03",
      rating: 5,
      format: "Image",
      status: "Rating Pending"
    }
  ];

  assert.equal(
    filterNewAds(ads, {
      language: "English",
      month: "2026-03",
      minRating: "3",
      format: "Video",
      status: "Available for Use"
    }).length,
    1
  );
});

test("selectFilteredNewAds excludes rejected IDs", () => {
  const ads = [
    {
      id: "keep-1",
      language: "English",
      month: "2026-03",
      rating: 4,
      format: "Video",
      status: "Available for Use"
    },
    {
      id: "reject",
      language: "English",
      month: "2026-03",
      rating: 5,
      format: "Video",
      status: "Available for Use"
    },
    {
      id: "keep-2",
      language: "Spanish",
      month: "2026-03",
      rating: 5,
      format: "Video",
      status: "Available for Use"
    }
  ];

  const selection = selectFilteredNewAds(
    ads,
    5,
    {
      month: "2026-03",
      format: "Video"
    },
    {
      excludeIds: ["reject"]
    }
  );

  assert.deepEqual(
    selection.map((ad) => ad.id).sort(),
    ["keep-1", "keep-2"]
  );
});

test("createAdNameFields prefills editable naming details", () => {
  assert.deepEqual(
    createAdNameFields(
      {
        id: "Mar26-100",
        topic: "Come to Church",
        mission: "Denver",
        missionaryNames: "Elder A / Elder B",
        country: "USA",
        language: "Spanish",
        format: "Video"
      },
      "2026-06-12"
    ),
    {
      description: "Come to Church",
      startDate: "2026-06-12",
      topic: "Come to Church",
      blessing: "",
      subject: "Elder A / Elder B",
      format: "Video",
      localized: "True",
      creativeId: "Mar26-100",
      testingId: ""
    }
  );
});

test("createAdNameFields uses Mission when Script / Topic is blank", () => {
  const fields = createAdNameFields(
    {
      id: "Mar26-101",
      topic: "",
      mission: "Denver",
      missionaryNames: "",
      country: "USA",
      language: "English",
      format: "Video"
    },
    "2026-06-12"
  );

  assert.equal(fields.description, "Denver");
  assert.equal(fields.topic, "Denver");
});

test("ID and Drive helpers return usable values", () => {
  assert.equal(
    generateToppyAdId({
      date: new Date(2026, 5, 12),
      random: () => 0
    }),
    "TPY-20260612-AAAAAA"
  );
  assert.equal(
    getGoogleDriveDownloadUrl("https://drive.google.com/file/d/abc123/view"),
    "https://drive.usercontent.google.com/download?id=abc123&export=download&confirm=t"
  );
});

test("download filenames use the Ad ID and media type", () => {
  assert.equal(
    getAdDownloadFilename({
      adId: "Mar26-00042",
      format: "Video",
      contentType: "video/quicktime"
    }),
    "Mar26-00042.mov"
  );
  assert.equal(
    getAdDownloadFilename({
      adId: "TPY:bad/name",
      format: "Image",
      contentType: "image/png"
    }),
    "TPY-bad-name.png"
  );
});

test("downloadNewAdFile creates a local download named with the Ad ID", async () => {
  const clicks = [];
  const appended = [];
  const revoked = [];
  const anchor = {
    hidden: false,
    href: "",
    download: "",
    click() {
      clicks.push({ href: this.href, download: this.download });
    },
    remove() {}
  };

  const result = await downloadNewAdFile({
    url: "https://drive.google.com/file/d/abc123/view",
    adId: "Mar26-00042",
    fetchImpl: async (url) => {
      assert.equal(
        url,
        "https://drive.usercontent.google.com/download?id=abc123&export=download&confirm=t"
      );
      return {
        ok: true,
        headers: new Headers({ "Content-Type": "video/mp4" }),
        blob: async () => new Blob(["video"], { type: "video/mp4" })
      };
    },
    documentRef: {
      createElement: () => anchor,
      body: {
        append(element) {
          appended.push(element);
        }
      }
    },
    urlApi: {
      createObjectURL: () => "blob:toppy-video",
      revokeObjectURL: (url) => revoked.push(url)
    },
    revokeDelay: 0
  });

  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(result.filename, "Mar26-00042.mp4");
  assert.equal(result.openedInNewTab, false);
  assert.equal(appended.length, 1);
  assert.deepEqual(clicks, [
    {
      href: "blob:toppy-video",
      download: "Mar26-00042.mp4"
    }
  ]);
  assert.deepEqual(revoked, ["blob:toppy-video"]);
});

test("downloadNewAdFile falls back to a direct Drive download when fetch is blocked", async () => {
  const clicks = [];
  const anchor = {
    hidden: false,
    href: "",
    download: "",
    target: "",
    rel: "",
    click() {
      clicks.push({
        href: this.href,
        download: this.download,
        target: this.target,
        rel: this.rel
      });
    },
    remove() {}
  };

  const result = await downloadNewAdFile({
    url: "https://drive.google.com/file/d/abc123/view",
    adId: "Mar26-00042",
    fetchImpl: async () => {
      throw new TypeError("Failed to fetch");
    },
    documentRef: {
      createElement: () => anchor,
      body: {
        append() {}
      }
    }
  });

  assert.equal(result.filename, "Mar26-00042.mp4");
  assert.equal(result.openedInNewTab, true);
  assert.deepEqual(clicks, [
    {
      href:
        "https://drive.usercontent.google.com/download?id=abc123&export=download&confirm=t",
      download: "Mar26-00042.mp4",
      target: "_blank",
      rel: "noopener noreferrer"
    }
  ]);
});

test("downloadNewAdFile can open the Drive download in a new tab", async () => {
  const clicks = [];
  const anchor = {
    hidden: false,
    href: "",
    download: "",
    target: "",
    rel: "",
    click() {
      clicks.push({
        href: this.href,
        download: this.download,
        target: this.target,
        rel: this.rel
      });
    },
    remove() {}
  };
  let fetchCalled = false;

  const result = await downloadNewAdFile({
    url: "https://drive.google.com/file/d/abc123/view",
    adId: "Mar26-00042",
    openInNewTab: true,
    fetchImpl: async () => {
      fetchCalled = true;
      throw new Error("fetch should not run");
    },
    documentRef: {
      createElement: () => anchor,
      body: {
        append() {}
      }
    }
  });

  assert.equal(fetchCalled, false);
  assert.equal(result.filename, "Mar26-00042.mp4");
  assert.equal(result.openedInNewTab, true);
  assert.deepEqual(clicks, [
    {
      href:
        "https://drive.usercontent.google.com/download?id=abc123&export=download&confirm=t",
      download: "Mar26-00042.mp4",
      target: "_blank",
      rel: "noopener noreferrer"
    }
  ]);
});

test("downloadNewAdFiles downloads selected ads as Creative ID filenames", async () => {
  const calls = [];
  const waits = [];

  const results = await downloadNewAdFiles({
    ads: [
      {
        id: "Mar26-00042",
        videoUrl: "https://drive.google.com/file/d/abc123/view",
        format: "Video"
      },
      {
        id: "Mar26-00043",
        videoUrl: "https://drive.google.com/file/d/def456/view",
        format: "Image"
      }
    ],
    downloadFile: async (ad) => {
      calls.push(ad);
      return {
        filename: `${ad.adId}.${ad.format === "Image" ? "jpg" : "mp4"}`,
        size: 12,
        type: ""
      };
    },
    delayMs: 25,
    wait: async (ms) => waits.push(ms)
  });

  assert.deepEqual(
    calls.map((call) => [call.adId, call.url, call.format]),
    [
      ["Mar26-00042", "https://drive.google.com/file/d/abc123/view", "Video"],
      ["Mar26-00043", "https://drive.google.com/file/d/def456/view", "Image"]
    ]
  );
  assert.deepEqual(
    results.map((result) => result.filename),
    ["Mar26-00042.mp4", "Mar26-00043.jpg"]
  );
  assert.deepEqual(waits, [25]);
});

test("buildWindowsRenameScript maps selected ads to Creative IDs", () => {
  const script = buildWindowsRenameScript([
    {
      id: "Mar26-00042",
      format: "Video"
    },
    {
      id: "TPY:bad/name",
      format: "Image"
    }
  ]);

  assert.match(script, /Toppy Windows rename script/);
  assert.match(script, /\$CreativeIds = @\(/);
  assert.match(script, /'Mar26-00042'/);
  assert.match(script, /'TPY-bad-name'/);
  assert.match(script, /Rename-Item -LiteralPath/);
  assert.match(script, /Type YES to continue/);
});

test("downloadWindowsRenameScript creates a PowerShell script download", () => {
  const clicks = [];
  const appended = [];
  const revoked = [];
  const anchor = {
    hidden: false,
    href: "",
    download: "",
    click() {
      clicks.push({ href: this.href, download: this.download });
    },
    remove() {}
  };

  const result = downloadWindowsRenameScript({
    ads: [
      {
        id: "Mar26-00042",
        format: "Video"
      }
    ],
    documentRef: {
      createElement: () => anchor,
      body: {
        append(element) {
          appended.push(element);
        }
      }
    },
    urlApi: {
      createObjectURL: () => "blob:toppy-rename-script",
      revokeObjectURL: (url) => revoked.push(url)
    },
    revokeDelay: 0
  });

  assert.equal(result.filename, getAdRenameScriptFilename());
  assert.equal(result.count, 1);
  assert.equal(appended.length, 1);
  assert.deepEqual(clicks, [
    {
      href: "blob:toppy-rename-script",
      download: "toppy-rename-selected-ads.ps1"
    }
  ]);
});

test("uploaded CSV data supports filtering by language and rating", () => {
  const csv = [
    "Mission,Language,Script / Topic,Creative ID,Image?,Rating,Status,Final Video Link",
    "Denver,English,Come to Church,Upload-100,FALSE,4,Available for Use,https://drive.google.com/file/d/abc/view",
    "Boise,English,Faith,Upload-101,FALSE,2,Available for Use,https://drive.google.com/file/d/def/view",
    "Provo,Spanish,Prayer,Upload-102,TRUE,5,Rating Pending,https://drive.google.com/file/d/ghi/view"
  ].join("\n");
  const ads = parseNewAdsCsv(csv, {
    month: "upload-1",
    monthLabel: "My Upload"
  });

  assert.equal(
    filterNewAds(ads, {
      language: "English",
      minRating: "3"
    }).length,
    1
  );
  assert.equal(
    filterNewAds(ads, {
      language: "Spanish"
    }).length,
    1
  );
});
