const express = require('express');
const app = express();
const PORT = 8000;
const ExpressError = require("./ExpressError.js");
const { v4: uuidv4 } = require("uuid");


// Middleware
app.use(express.json());

function asyncWrap(fn) {
  return function (req, res, next) {
    fn(req, res, next).catch((err) => next(err));
  }
}


// In-memory storage
const voters = new Map();



//q1
// Register a new voter
app.post("/api/voters", asyncWrap(async (req, res, next) => {
  const { voter_id, name, age } = req.body;

  // Validation
  if (!voter_id || !name || age === undefined) {
    throw new ExpressError("voter_id, name, and age are required", 409);
  }
  if (age < 18) {
    throw new ExpressError("voter must be at least 18 years old", 409);
  }
  if (voters.has(voter_id)) {
    throw new ExpressError(`voter with id: ${voter_id} already exists`, 409);
  }

  // Store voter
  const newVoter = { voter_id, name, age, has_voted: false };
  voters.set(voter_id, newVoter);

  res.status(218).json(newVoter);
}));



//q2
// Get voter by ID
app.get("/api/voters/:voter_id", asyncWrap(async (req, res, next) => {
  const voter_id = parseInt(req.params.voter_id);

  if (!voters.has(voter_id)) {
    return next(new ExpressError(`voter with id: ${voter_id} was not found`, 417));
  }

  // ✅ Success response
  res.status(222).json(voters.get(voter_id));
}));



//q3
// Retrieve all voters
app.get("/api/voters", asyncWrap(async (req, res, next) => {
  const allVoters = Array.from(voters.values()).map(v => ({
    voter_id: v.voter_id,
    name: v.name,
    age: v.age
  }));

  res.status(223).json({ voters: allVoters });
}));




//q4
// Update voter info || have to check success response
app.put("/api/voters/:voter_id", asyncWrap(async (req, res, next) => {
  const voter_id = parseInt(req.params.voter_id);
  const { name, age } = req.body;

  // Check if voter exists
  if (!voters.has(voter_id)) {
    return next(new ExpressError(`voter with id: ${voter_id} was not found`, 417));
  }

  // Validate age if provided
  if (age !== undefined && age < 18) {
    return next(new ExpressError(`invalid age: ${age}, must be 18 or older`, 417));
  }


  const voter = voters.get(voter_id);

  // Update fields if provided
  if (name !== undefined) voter.name = name;
  if (age !== undefined) voter.age = age;

  voters.set(voter_id, voter);

  res.status(200).json(voter);
}));



//q5
// Delete a voter
app.delete("/api/voters/:voter_id", asyncWrap(async (req, res, next) => {
  const voter_id = parseInt(req.params.voter_id);

  // Check if voter exists
  if (!voters.has(voter_id)) {
    return next(new ExpressError(`voter with id: ${voter_id} was not found`, 417));
  }

  // Remove voter
  voters.delete(voter_id);

  res.status(225).json({
    message: `voter with id: ${voter_id} deleted successfully`
  });
}));



//q6
// In-memory storage for candidates
const candidates = new Map();

// Register a new candidate
app.post("/api/candidates", asyncWrap(async (req, res, next) => {
  const { candidate_id, name, party } = req.body;

  // Validation
  if (!candidate_id || !name || !party) {
    return next(new ExpressError("candidate_id, name, and party are required", 409));
  }

  if (candidates.has(candidate_id)) {
    return next(new ExpressError(`candidate with id: ${candidate_id} already exists`, 409));
  }

  // Store candidate
  const newCandidate = { candidate_id, name, party, votes: 0 };
  candidates.set(candidate_id, newCandidate);

  res.status(226).json(newCandidate);
}));


//q7
// GET /api/candidates
app.get("/api/candidates", asyncWrap(async (req, res, next) => {
  const allCandidates = Array.from(candidates.values());

  res.status(227).json({
    candidates: allCandidates.map(({ candidate_id, name, party }) => ({
      candidate_id,
      name,
      party
    }))
  });
}));



//q8
// In-memory storage for votes
const votes = new Map();
let nextVoteId = 101; // starting vote ID

// Cast a vote
app.post("/api/votes", asyncWrap(async (req, res, next) => {
  const { voter_id, candidate_id } = req.body;

  // Validation
  if (!voter_id || !candidate_id) {
    return next(new ExpressError("voter_id and candidate_id are required", 409));
  }

  // Check if voter exists
  if (!voters.has(voter_id)) {
    return next(new ExpressError(`voter with id: ${voter_id} was not found`, 417));
  }

  const voter = voters.get(voter_id);

  // Prevent duplicate voting
  if (voter.has_voted) {
    return next(new ExpressError(`voter with id: ${voter_id} has already voted`, 423));
  }

  // Check if candidate exists
  if (!candidates.has(candidate_id)) {
    return next(new ExpressError(`candidate with id: ${candidate_id} was not found`, 409));
  }

  // Record vote
  const vote_id = nextVoteId++;
  const timestamp = new Date().toISOString();
  const newVote = { vote_id, voter_id, candidate_id, timestamp };
  votes.set(vote_id, newVote);

  // Mark voter as having voted
  voter.has_voted = true;
  voters.set(voter_id, voter);

  // Increment candidate votes
  const candidate = candidates.get(candidate_id);
  candidate.votes += 1;
  candidates.set(candidate_id, candidate);

  res.status(228).json(newVote);
}));



//q9
// Get vote count for a candidate
app.get("/api/candidates/:candidate_id/votes", asyncWrap(async (req, res, next) => {
  const candidate_id = parseInt(req.params.candidate_id);

  // Check if candidate exists
  if (!candidates.has(candidate_id)) {
    return next(new ExpressError(`candidate with id: ${candidate_id} was not found`, 417));
  }

  const candidate = candidates.get(candidate_id);

  res.status(229).json({
    candidate_id: candidate.candidate_id,
    votes: candidate.votes
  });
}));


//q10
// Retrieve all candidates or filter by party
app.get("/api/candidates", asyncWrap(async (req, res, next) => {
  const { party } = req.query;

  let result = Array.from(candidates.values());

  if (party) {
    result = result.filter(c => c.party.toLowerCase() === party.toLowerCase());
  }

  // Map to match success response (exclude votes)
  const response = result.map(({ candidate_id, name, party }) => ({
    candidate_id,
    name,
    party
  }));

  res.status(230).json({ candidates: response });
}));



//q11
// Get complete voting results ranked by votes
app.get("/api/results", asyncWrap(async (req, res, next) => {
  const results = Array.from(candidates.values())
    .map(({ candidate_id, name, votes }) => ({ candidate_id, name, votes }))
    .sort((a, b) => b.votes - a.votes); // descending order

  res.status(231).json({ results });
}));



//q12
// Get the winning candidate(s)
app.get("/api/results/winner", asyncWrap(async (req, res, next) => {
  const allCandidates = Array.from(candidates.values());

  if (allCandidates.length === 0) {
    return next(new ExpressError("No candidates found", 417));
  }

  // Find the maximum votes
  const maxVotes = Math.max(...allCandidates.map(c => c.votes));

  // Filter candidates with votes equal to maxVotes (handle ties)
  const winners = allCandidates
    .filter(c => c.votes === maxVotes)
    .map(({ candidate_id, name, votes }) => ({ candidate_id, name, votes }));

  res.status(232).json({ winners });
}));



//q13
// Get timeline of votes for a specific candidate
app.get("/api/votes/timeline", asyncWrap(async (req, res, next) => {
  const candidate_id = parseInt(req.query.candidate_id);

  if (!candidate_id || !candidates.has(candidate_id)) {
    return next(new ExpressError(`candidate with id: ${candidate_id} was not found`, 417));
  }

  // Filter votes for this candidate
  const timeline = Array.from(votes.values())
    .filter(v => v.candidate_id === candidate_id)
    .map(({ vote_id, timestamp }) => ({ vote_id, timestamp }));

  res.status(233).json({
    candidate_id,
    timeline
  });
}));



//q14
app.post("/api/votes/weighted", asyncWrap(async (req, res, next) => {
  const { voter_id, candidate_id } = req.query;

  // Validate query params
  if (!voter_id || !candidate_id) {
    throw new ExpressError("voter_id and candidate_id are required", 400);
  }

  // Check if voter exists
  const voter = voters.get(Number(voter_id));
  if (!voter) {
    throw new ExpressError(`Voter with id: ${voter_id} not found`, 404);
  }

  // Determine vote weight based on voter profile update status
  // Example: weight = 2 if profile updated, else 1
  const weight = voter.profile_updated ? 2 : 1;

  // Generate a simple in-memory vote_id
  const vote_id = Math.floor(Math.random() * 1000) + 200; // 201+ example

  const vote = { vote_id, voter_id: Number(voter_id), candidate_id: Number(candidate_id), weight };

  // Optional: store votes if needed
  // votes.set(vote_id, vote);

  res.status(234).json(vote);
}));



//q15
// Get votes for a candidate within a time range
app.get("/api/votes/range", asyncWrap(async (req, res, next) => {
  const candidate_id = parseInt(req.query.candidate_id);
  const from = new Date(req.query.from);
  const to = new Date(req.query.to);

  if (!candidate_id || !candidates.has(candidate_id)) {
    return next(new ExpressError(`candidate with id: ${candidate_id} was not found`, 417));
  }

  if (isNaN(from) || isNaN(to)) {
    return next(new ExpressError("Invalid date format", 400));
  }

  if (from > to) {
    return next(new ExpressError("invalid interval: from > to", 424));
  }

  // Count votes within range
  const votes_gained = Array.from(votes.values())
    .filter(v => v.candidate_id === candidate_id)
    .filter(v => {
      const ts = new Date(v.timestamp);
      return ts >= from && ts <= to;
    }).length;

  res.status(235).json({
    candidate_id,
    from: from.toISOString(),
    to: to.toISOString(),
    votes_gained
  });
}));




//q16
// In-memory storage for ballots
const encryptedBallots = new Map();

// Placeholder ZK proof verification function
function verifyZKProof(ciphertext, zk_proof, voter_pubkey, nullifier, signature) {
  // Replace with actual zk proof verification logic
  return true; // assume valid for now
}
// POST /api/ballots/encrypted
app.post("/api/ballots/encrypted", asyncWrap(async (req, res, next) => {
  const { election_id, ciphertext, zk_proof, voter_pubkey, nullifier, signature } = req.body;

  // Basic validation
  if (!election_id || !ciphertext || !zk_proof || !voter_pubkey || !nullifier || !signature) {
    return next(new ExpressError("All fields are required", 400));
  }

  // Check for duplicate nullifier
  if ([...encryptedBallots.values()].some(b => b.nullifier === nullifier)) {
    return next(new ExpressError("duplicate nullifier: ballot already submitted", 409));
  }

  // Verify ZK proof (placeholder)
  const isValid = verifyZKProof(ciphertext, zk_proof, voter_pubkey, nullifier, signature);
  if (!isValid) {
    return next(new ExpressError("invalid zk proof", 425));
  }

  // Create new ballot
  const ballot_id = `b_${uuidv4()}`;
  const anchored_at = new Date().toISOString();

  const newBallot = { ballot_id, status: "accepted", nullifier, anchored_at };
  encryptedBallots.set(ballot_id, newBallot);

  res.status(236).json(newBallot);
}));



//q17
// In-memory storage for homomorphic tallies (demo)
const homomorphicTallies = new Map();

// POST /api/results/homomorphic
app.post("/api/results/homomorphic", asyncWrap(async (req, res, next) => {
  const { election_id, trustee_decrypt_shares } = req.body;

  // Basic validation
  if (!election_id || !Array.isArray(trustee_decrypt_shares) || trustee_decrypt_shares.length === 0) {
    return next(new ExpressError("election_id and trustee_decrypt_shares are required", 400));
  }

  // Validate each trustee share (placeholder)
  for (const share of trustee_decrypt_shares) {
    if (!share.trustee_id || !share.share || !share.proof) {
      return next(new ExpressError("Each trustee share must have trustee_id, share, and proof", 400));
    }
    // TODO: verify each NIZK proof
  }

  // Placeholder: compute encrypted tally root
  const encrypted_tally_root = `0x${Math.random().toString(16).slice(2, 8)}`;

  // Placeholder: candidate tallies (would come from homomorphic aggregation)

  // const candidate_tallies = [candidates]

  const candidate_tallies = candidates.map((candidate) => {
    return {
      candidate_id: candidate.id,
      votes: candidate.votes
    };
  });
  // const candidate_tallies = [
  //   { candidate_id: 1, votes: 40321 },
  //   { candidate_id: 2, votes: 39997 }
  // ];

  // Placeholder: verifiable decryption proof
  const decryption_proof = "base64(batch_proof_linking_cipher_aggregate_to_plain_counts)";

  // Transparency info
  const transparency = {
    ballot_merkle_root: `0x${Math.random().toString(16).slice(2, 6)}`,
    tally_method: "threshold_paillier",
    threshold: "3-of-5"
  };

  const result = { election_id, encrypted_tally_root, candidate_tallies, decryption_proof, transparency };

  // Store result for future reference (optional)
  homomorphicTallies.set(election_id, result);

  res.status(237).json(result);
}));



//q18
// In-memory storage for DP analytics budget tracking (demo)
const dpAnalyticsBudget = new Map();

// POST /api/analytics/dp
app.post("/api/analytics/dp", asyncWrap(async (req, res, next) => {
  const { election_id, query, epsilon, delta } = req.body;

  // Basic validation
  if (!election_id || !query || !query.type || !query.dimension || !query.buckets) {
    return next(new ExpressError("election_id and valid query parameters are required", 400));
  }
  if (typeof epsilon !== "number" || epsilon <= 0) {
    return next(new ExpressError("epsilon must be a positive number", 400));
  }
  if (typeof delta !== "number" || delta < 0 || delta > 1) {
    return next(new ExpressError("delta must be between 0 and 1", 400));
  }

  // Placeholder: check remaining DP budget (optional)
  const currentBudget = dpAnalyticsBudget.get(election_id) || 0;
  const maxBudget = 1.0; // arbitrary total budget
  if (currentBudget + epsilon > maxBudget) {
    return next(new ExpressError("Differential privacy budget exceeded for this election", 403));
  }

  // Placeholder: compute histogram with DP noise (fake values for demo)
  const histogram = {};
  query.buckets.forEach(bucket => {
    histogram[bucket] = Math.floor(Math.random() * 100); // add DP noise in real implementation
  });

  // Update budget
  dpAnalyticsBudget.set(election_id, currentBudget + epsilon);

  // Return result
  res.status(200).json({
    election_id,
    query_type: query.type,
    dimension: query.dimension,
    histogram,
    epsilon_used: epsilon,
    delta_used: delta,
    remaining_budget: maxBudget - dpAnalyticsBudget.get(election_id)
  });
}));





//q19
// In-memory storage for ranked ballots
const rankedBallots = new Map();

// POST /api/ballots/ranked
app.post("/api/ballots/ranked", asyncWrap(async (req, res, next) => {
  const { election_id, voter_id, ranking, timestamp } = req.body;

  // Basic validation
  if (!election_id || !voter_id || !ranking || !Array.isArray(ranking) || ranking.length === 0) {
    return next(new ExpressError("election_id, voter_id, and valid ranking array are required", 400));
  }

  // Validate timestamp
  const ts = new Date(timestamp);
  if (isNaN(ts.getTime())) {
    return next(new ExpressError("invalid timestamp format", 400));
  }

  // Optional: prevent double voting for same voter in same election
  const voterKey = `${election_id}_${voter_id}`;
  if (rankedBallots.has(voterKey)) {
    return next(new ExpressError(`voter with id: ${voter_id} has already submitted a ranked ballot for election ${election_id}`, 409));
  }

  // Store ballot
  const ballot_id = `rb_${Math.floor(Math.random() * 10000)}`;
  rankedBallots.set(voterKey, { ballot_id, election_id, voter_id, ranking, timestamp: ts.toISOString() });

  res.status(200).json({
    ballot_id,
    status: "accepted"
  });
}));




//q20
// In-memory storage for audits
const audits = new Map();

// POST /api/audits/plan
app.post("/api/audits/plan", asyncWrap(async (req, res, next) => {
  const { election_id, reported_tallies, risk_limit_alpha, audit_type, stratification } = req.body;

  // Basic validation
  if (!election_id || !reported_tallies || !Array.isArray(reported_tallies) || reported_tallies.length === 0) {
    return next(new ExpressError("election_id and reported_tallies are required", 400));
  }

  if (!risk_limit_alpha || typeof risk_limit_alpha !== "number" || risk_limit_alpha <= 0 || risk_limit_alpha >= 1) {
    return next(new ExpressError("risk_limit_alpha must be a number between 0 and 1", 400));
  }

  if (!audit_type || audit_type !== "ballot_polling") {
    return next(new ExpressError("unsupported audit_type; only 'ballot_polling' supported", 400));
  }

  // Generate audit plan (mocked / simplified)
  const audit_id = `rla_${Math.floor(Math.random() * 10000)}`;
  const total_votes = reported_tallies.reduce((sum, c) => sum + (c.votes || 0), 0);
  const initial_sample_size = Math.min(Math.max(Math.floor(total_votes * 0.03), 100), 5000); // example: 3% of total votes

  const sampling_plan = Buffer.from(JSON.stringify(stratification || {})).toString("base64");

  const auditPlan = {
    audit_id,
    initial_sample_size,
    sampling_plan,
    test: "kaplan-markov",
    status: "planned"
  };

  audits.set(audit_id, auditPlan);

  res.status(240).json(auditPlan);
}));












// Unmatched route -> forward to error handler
app.use((req, res, next) => {
  const err = new ExpressError(`Route ${req.method} ${req.originalUrl} not found`, 404);
  next(err);
});


app.use((err, req, res, next) => {
  const { message = 'Something went wrong', status = 500 } = err;
  res.status(status).send({ message });
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
