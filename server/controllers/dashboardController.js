// controllers/dashboardController.js
const { DCRequest } = require("../models/DCRequest");
const { EstimationRequest } = require("../models/EstimationRequest");
const Construction = require("../models/Construction");
const Design = require("../models/Design");
const Specification = require("../models/Specification");
const User = require("../models/User");
const Session = require("../models/Session");

/* =========================================================
   Helpers
========================================================= */
const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const startOfWeek = () => {
  const d = startOfToday();
  const day = d.getDay(); // 0 = Sunday
  const diff = (day + 6) % 7; // Monday as start
  d.setDate(d.getDate() - diff);
  return d;
};

const startOfMonth = () => {
  const d = startOfToday();
  d.setDate(1);
  return d;
};

// Build "assigned to me" filter based on role
const scopeFilter = (user) => {
  if (!user) return {};
  if (user.role === "SUPER_ADMIN" || user.role === "ADMIN") return {};
  return { assignedTo: user.username || user.name };
};

/* =========================================================
   GET /api/dashboard/summary
   Returns KPI counts for cards
========================================================= */
exports.getSummary = async (req, res) => {
  try {
    const scope = scopeFilter(req.user);
    const today = startOfToday();
    const week = startOfWeek();
    const month = startOfMonth();

    const [
      dcTotal,
      dcInProgress,
      dcCompleted,
      dcRejected,
      dcToday,
      dcThisWeek,

      estTotal,
      estInProgress,
      estCompleted,
      estRejected,
      estToday,

      constructionTotal,
      designTotal,
      specificationTotal,

      usersTotal,
      usersEnabled,
      activeSessions,
    ] = await Promise.all([
      DCRequest.countDocuments({ ...scope }),
      DCRequest.countDocuments({ ...scope, status: "In Progress" }),
      DCRequest.countDocuments({ ...scope, status: "Completed" }),
      DCRequest.countDocuments({ ...scope, status: "Rejected" }),
      DCRequest.countDocuments({ ...scope, createdAt: { $gte: today } }),
      DCRequest.countDocuments({ ...scope, createdAt: { $gte: week } }),

      EstimationRequest.countDocuments({ ...scope }),
      EstimationRequest.countDocuments({ ...scope, status: "In Progress" }),
      EstimationRequest.countDocuments({ ...scope, status: "Completed" }),
      EstimationRequest.countDocuments({ ...scope, status: "Rejected" }),
      EstimationRequest.countDocuments({ ...scope, createdAt: { $gte: today } }),

      Construction.countDocuments({}),
      Design.countDocuments({}),
      Specification.countDocuments({}),

      User.countDocuments({}),
      User.countDocuments({ enabled: true }),
      Session.countDocuments({ isActive: true }),
    ]);

    res.json({
      success: true,
      data: {
        dcRequests: {
          total: dcTotal,
          inProgress: dcInProgress,
          completed: dcCompleted,
          rejected: dcRejected,
          today: dcToday,
          thisWeek: dcThisWeek,
        },
        estimationRequests: {
          total: estTotal,
          inProgress: estInProgress,
          completed: estCompleted,
          rejected: estRejected,
          today: estToday,
        },
        construction: { total: constructionTotal },
        design: { total: designTotal },
        specification: { total: specificationTotal },
        users: {
          total: usersTotal,
          enabled: usersEnabled,
          activeSessions,
        },
        meta: {
          scope:
            req.user?.role === "USER" ? `assigned to ${req.user.username}` : "all",
          generatedAt: new Date().toISOString(),
        },
      },
    });
  } catch (err) {
    console.error("dashboard.getSummary:", err);
    res.status(500).json({ success: false, message: "Failed to load summary" });
  }
};

/* =========================================================
   GET /api/dashboard/trends?days=14
   Daily counts for DC + Estimation (created & completed)
========================================================= */
exports.getTrends = async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days, 10) || 14, 90);
    const since = startOfToday();
    since.setDate(since.getDate() - (days - 1));

    const scope = scopeFilter(req.user);

    const buildPipeline = (model, dateField = "createdAt") => [
      { $match: { ...scope, [dateField]: { $gte: since } } },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: `$${dateField}` },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ];

    const [dcCreated, dcCompleted, estCreated, estCompleted] =
      await Promise.all([
        DCRequest.aggregate(buildPipeline(DCRequest, "createdAt")),
        DCRequest.aggregate([
          {
            $match: {
              ...scope,
              status: "Completed",
              updatedAt: { $gte: since },
            },
          },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$updatedAt" },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),
        EstimationRequest.aggregate(buildPipeline(EstimationRequest, "createdAt")),
        EstimationRequest.aggregate([
          {
            $match: {
              ...scope,
              status: "Completed",
              updatedAt: { $gte: since },
            },
          },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$updatedAt" },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),
      ]);

    // Build a dense date axis
    const axis = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      axis.push(d.toISOString().slice(0, 10));
    }

    const toMap = (arr) =>
      arr.reduce((acc, x) => ((acc[x._id] = x.count), acc), {});

    const dcCreatedMap = toMap(dcCreated);
    const dcCompletedMap = toMap(dcCompleted);
    const estCreatedMap = toMap(estCreated);
    const estCompletedMap = toMap(estCompleted);

    res.json({
      success: true,
      data: {
        labels: axis,
        dcCreated: axis.map((d) => dcCreatedMap[d] || 0),
        dcCompleted: axis.map((d) => dcCompletedMap[d] || 0),
        estCreated: axis.map((d) => estCreatedMap[d] || 0),
        estCompleted: axis.map((d) => estCompletedMap[d] || 0),
      },
    });
  } catch (err) {
    console.error("dashboard.getTrends:", err);
    res.status(500).json({ success: false, message: "Failed to load trends" });
  }
};

/* =========================================================
   GET /api/dashboard/recent?limit=10
   Latest activity across DC + Estimation
========================================================= */
exports.getRecent = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
    const scope = scopeFilter(req.user);

    const [dcs, ests] = await Promise.all([
      DCRequest.find(scope)
        .sort({ createdAt: -1 })
        .limit(limit)
        .select("DCId requestingOrgan requestType placeofSite status assignedTo createdAt")
        .lean(),
      EstimationRequest.find(scope)
        .sort({ createdAt: -1 })
        .limit(limit)
        .select("estimationId requestingOrgan applicantName propertyAddress status assignedTo createdAt")
        .lean(),
    ]);

    const merged = [
      ...dcs.map((d) => ({
        kind: "DC",
        id: d.DCId,
        title: d.requestType || "DC Request",
        organ: d.requestingOrgan,
        location: d.placeofSite,
        status: d.status,
        assignedTo: d.assignedTo,
        createdAt: d.createdAt,
      })),
      ...ests.map((e) => ({
        kind: "EST",
        id: e.estimationId,
        title: "Estimation Request",
        organ: e.requestingOrgan,
        location: e.propertyAddress,
        status: e.status,
        assignedTo: e.assignedTo,
        createdAt: e.createdAt,
      })),
    ]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);

    res.json({ success: true, data: merged });
  } catch (err) {
    console.error("dashboard.getRecent:", err);
    res.status(500).json({ success: false, message: "Failed to load recent activity" });
  }
};

/* =========================================================
   GET /api/dashboard/status-breakdown
   For pie / donut charts
========================================================= */
exports.getStatusBreakdown = async (req, res) => {
  try {
    const scope = scopeFilter(req.user);

    const groupByStatus = async (Model) =>
      Model.aggregate([
        { $match: scope },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]);

    const [dc, est] = await Promise.all([
      groupByStatus(DCRequest),
      groupByStatus(EstimationRequest),
    ]);

    const toObj = (arr) =>
      arr.reduce((acc, x) => ((acc[x._id] = x.count), acc), {});

    res.json({
      success: true,
      data: {
        dc: toObj(dc),
        estimation: toObj(est),
      },
    });
  } catch (err) {
    console.error("dashboard.getStatusBreakdown:", err);
    res.status(500).json({ success: false, message: "Failed to load breakdown" });
  }
};

/* =========================================================
   GET /api/dashboard/workload
   Count of active items per assignee (admin only)
========================================================= */
exports.getWorkload = async (req, res) => {
  try {
    if (req.user?.role === "USER") {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const [dc, est] = await Promise.all([
      DCRequest.aggregate([
        { $match: { status: "In Progress", assignedTo: { $ne: "" } } },
        { $group: { _id: "$assignedTo", count: { $sum: 1 } } },
      ]),
      EstimationRequest.aggregate([
        { $match: { status: "In Progress", assignedTo: { $ne: "" } } },
        { $group: { _id: "$assignedTo", count: { $sum: 1 } } },
      ]),
    ]);

    const map = {};
    for (const r of dc) map[r._id] = (map[r._id] || 0) + r.count;
    for (const r of est) map[r._id] = (map[r._id] || 0) + r.count;

    const rows = Object.entries(map)
      .map(([assignee, count]) => ({ assignee, count }))
      .sort((a, b) => b.count - a.count);

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("dashboard.getWorkload:", err);
    res.status(500).json({ success: false, message: "Failed to load workload" });
  }
};