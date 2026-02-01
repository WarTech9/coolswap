// SECURITY: Validate transaction before signing

// 1. Check that server wallet is the fee payer
const feePayer = txObj.message.staticAccountKeys[0];
const serverAddress = serverKeypair.publicKey;

if (!feePayer.equals(serverAddress)) {
  console.error('Fee payer mismatch:', {
    expected: serverAddress.toBase58(),
    actual: feePayer.toBase58(),
  });
  return res.status(400).json({ error: 'Invalid fee payer' });
}

// 2. Validate Instruction 0 exists
const instructions = txObj.message.compiledInstructions;
if (!instructions || instructions.length === 0) {
  return res.status(400).json({ error: 'Transaction has no instructions' });
}

// 3. Additional validation: Check reasonable instruction count (< 10)
if (instructions.length > 10) {
  console.error('Too many instructions:', instructions.length);
  return res.status(400).json({ error: 'Transaction has too many instructions' });
}
// 4. SECURITY: Validate Instruction 0 is a token transfer (payment to server)
const firstInstruction = instructions[0];
const programIdIndex = firstInstruction.programIdIndex;
const programId = txObj.message.staticAccountKeys[programIdIndex];

// Token Program IDs (standard and Token-2022)
const TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const TOKEN_2022_PROGRAM_ID = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';

const isTokenProgram =
  programId.toBase58() === TOKEN_PROGRAM_ID ||
  programId.toBase58() === TOKEN_2022_PROGRAM_ID;

if (!isTokenProgram) {
  console.error('Instruction 0 is not a token transfer:', {
    programId: programId.toBase58(),
    expected: [TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID],
  });
  return res.status(400).json({
    error: 'First instruction must be a token transfer to server'
  });
}

console.log('✓ Instruction 0 is a token transfer (payment to server)');

// TODO: Future enhancements for deeper validation:
// - Verify destination is server's ATA for the specific token
// - Check payment amount is reasonable for gas cost
// - Validate no malicious instructions in the transaction
