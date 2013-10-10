/*
 *  jsaes version 0.1  -  Copyright 2006 B. Poettering
 *
 *  This program is free software; you can redistribute it and/or
 *  modify it under the terms of the GNU General Public License as
 *  published by the Free Software Foundation; either version 2 of the
 *  License, or (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 *  General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program; if not, write to the Free Software
 *  Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA
 *  02111-1307 USA
 */

/*
 * http://point-at-infinity.org/jsaes/
 *
 * This is a javascript implementation of the AES block cipher. Key lengths 
 * of 128, 192 and 256 bits are supported.
 *
 * The well-functioning of the encryption/decryption routines has been 
 * verified for different key lengths with the test vectors given in 
 * FIPS-197, Appendix C.
 *
 * The following code example enciphers the plaintext block '00 11 22 .. EE FF'
 * with the 256 bit key '00 01 02 .. 1E 1F'.
 *
 *    AES_Init();
 *
 *    var block = new Array(16);
 *    for(var i = 0; i < 16; i++)
 *        block[i] = 0x11 * i;
 *
 *    var key = new Array(32);
 *    for(var i = 0; i < 32; i++)
 *        key[i] = i;
 *
 *    AES_ExpandKey(key);
 *    AES_Encrypt(block, key);
 *
 *    AES_Done();
 *
 * Report bugs to: jsaes AT point-at-infinity.org
 *
 */

/******************************************************************************/

/* 
   AES_Init: initialize the tables needed at runtime. Call this function
   before the (first) key expansion.
*/

var AES_Sbox02 = new Array(256);
var AES_Sbox03 = new Array(256);
var T0 = new Array(256);
var T1 = new Array(256);
var T2 = new Array(256);
var T3 = new Array(256);

function toHexChar(d){
  var hexstr = '0123456789abcdef';
  return '' + hexstr[d >> 4] + '' + hexstr[d & 0xf];
}

function AES_Init() {
  AES_Sbox_Inv = new Array(256);
  for(var i = 0; i < 256; i++)
    AES_Sbox_Inv[AES_Sbox[i]] = i;
  
  AES_ShiftRowTab_Inv = new Array(16);
  for(var i = 0; i < 16; i++)
    AES_ShiftRowTab_Inv[AES_ShiftRowTab[i]] = i;

  AES_xtime = new Array(256);
  for(var i = 0; i < 128; i++) {
    AES_xtime[i] = i << 1;
    AES_xtime[128 + i] = (i << 1) ^ 0x1b;
  }
  for(var i = 0; i < 256; i++){
    AES_Sbox02[i] = AES_xtime[AES_Sbox[i]];
    AES_Sbox03[i] = AES_xtime[AES_Sbox[i]] ^ AES_Sbox[i];
  }
  for(var i = 0; i < 256; i++){
    T0[i] = new Array(AES_Sbox02[i], AES_Sbox[i], AES_Sbox[i], AES_Sbox03[i]);
    T1[i] = new Array(AES_Sbox03[i], AES_Sbox02[i], AES_Sbox[i], AES_Sbox[i]);
    T2[i] = new Array(AES_Sbox[i], AES_Sbox03[i], AES_Sbox02[i], AES_Sbox[i]);
    T3[i] = new Array(AES_Sbox[i], AES_Sbox[i], AES_Sbox03[i], AES_Sbox02[i]);
  }
}

/* 
   AES_Done: release memory reserved by AES_Init. Call this function after
   the last encryption/decryption operation.
*/

function AES_Done() {
  delete AES_Sbox_Inv;
  delete AES_ShiftRowTab_Inv;
  delete AES_xtime;
}

/*
   AES_ExpandKey: expand a cipher key. Depending on the desired encryption 
   strength of 128, 192 or 256 bits 'key' has to be a byte array of length 
   16, 24 or 32, respectively. The key expansion is done "in place", meaning 
   that the array 'key' is modified.
*/

function AES_ExpandKey(key) {
  var kl = key.length, ks, Rcon = 1;
  switch (kl) {
    case 16: ks = 16 * (10 + 1); break;
    case 24: ks = 16 * (12 + 1); break;
    case 32: ks = 16 * (14 + 1); break;
    default: 
      alert("AES_ExpandKey: Only key lengths of 16, 24 or 32 bytes allowed!");
  }
  for(var i = kl; i < ks; i += 4) {
    var temp = key.slice(i - 4, i);
    if (i % kl == 0) {
      temp = new Array(AES_Sbox[temp[1]] ^ Rcon, AES_Sbox[temp[2]], 
	AES_Sbox[temp[3]], AES_Sbox[temp[0]]); 
      if ((Rcon <<= 1) >= 256)
	Rcon ^= 0x11b;
    }
    else if ((kl > 24) && (i % kl == 16))
      temp = new Array(AES_Sbox[temp[0]], AES_Sbox[temp[1]], 
	AES_Sbox[temp[2]], AES_Sbox[temp[3]]);       
    for(var j = 0; j < 4; j++)
      key[i + j] = key[i + j - kl] ^ temp[j];
  }
}

/* 
   AES_Encrypt: encrypt the 16 byte array 'block' with the previously 
   expanded key 'key'.
*/

function AES_Encrypt(block, key) {
  var l = key.length;
  AES_AddRoundKey(block, key.slice(0, 16));
  for(var i = 16; i < l - 16; i += 16) {
    AES_SubBytes(block, AES_Sbox);
    AES_ShiftRows(block, AES_ShiftRowTab);
    AES_MixColumns(block);
    AES_AddRoundKey(block, key.slice(i, i + 16));
  }
  AES_SubBytes(block, AES_Sbox);
  AES_ShiftRows(block, AES_ShiftRowTab);
  AES_AddRoundKey(block, key.slice(i, l));
}

function AES_Encrypt_Fast(block, key){
  var l = key.length;
  console.log("Input:");
  console.log(block);
  AES_AddRoundKey(block, key.slice(0, 16));
  var t = new Array(16);
  var k = 16;
  for(var i = 16; i < l - 16; i += 16){
    for(var j = 0; j < 16; j++)
      t[j] = block[j];
    var a, b, c, d;
    a = block[0];
    b = block[5];
    c = block[10];
    d = block[15];
    var base = 0;
    for(var j = 0; j < 4; j++){
      t[base + j] = T0[a][j] ^ T1[b][j] ^ T2[c][j] ^ T3[d][j] ^ key[k++];
    }
    base = 4;
    a = block[4];
    b = block[9];
    c = block[14];
    d = block[3];
    for(var j = 0; j < 4; j++){
      t[base + j] = T0[a][j] ^ T1[b][j] ^ T2[c][j] ^ T3[d][j] ^ key[k++];
    }
    base = 8;
    a = block[8];
    b = block[13];
    c = block[2];
    d = block[7];
    for(var j = 0; j < 4; j++){
      t[base + j] = T0[a][j] ^ T1[b][j] ^ T2[c][j] ^ T3[d][j] ^ key[k++];
    }
    base = 12;
    a = block[12];
    b = block[1];
    c = block[6];
    d = block[11];
    for(var j = 0; j < 4; j++){
      t[base + j] = T0[a][j] ^ T1[b][j] ^ T2[c][j] ^ T3[d][j] ^ key[k++];
    }
  
    for(var j = 0; j < 16; j++)
      block[j] = t[j];
    console.log("Round " + (i / 16));
	//console.log(key.slice(i, i + 16));
	console.log(t);
  }/*
  t[0] = T2[block[0]][0] ^ key[k++];
  t[1] = T3[block[5]][1] ^ key[k++];
  t[2] = T0[block[10]][2] ^ key[k++];
  t[3] = T1[block[15]][3] ^ key[k++];
  t[4] = T2[block[4]][0] ^ key[k++];
  t[5] = T3[block[9]][1] ^ key[k++];
  t[6] = T0[block[14]][2] ^ key[k++];
  t[7] = T1[block[3]][3] ^ key[k++];
  t[8] = T2[block[8]][0] ^ key[k++];
  t[9] = T3[block[13]][1] ^ key[k++];
  t[10] = T0[block[2]][2] ^ key[k++];
  t[11] = T1[block[7]][3] ^ key[k++];
  t[12] = T2[block[12]][0] ^ key[k++];
  t[13] = T3[block[1]][1] ^ key[k++];
  t[14] = T0[block[6]][2] ^ key[k++];
  t[15] = T1[block[11]][3] ^ key[k++];
*/
  t[0] = T0[block[0]][2] ^ key[k++];
  t[1] = T0[block[5]][2] ^ key[k++];
  t[2] = T0[block[10]][2] ^ key[k++];
  t[3] = T0[block[15]][2] ^ key[k++];
  t[4] = T0[block[4]][2] ^ key[k++];
  t[5] = T0[block[9]][2] ^ key[k++];
  t[6] = T0[block[14]][2] ^ key[k++];
  t[7] = T0[block[3]][2] ^ key[k++];
  t[8] = T0[block[8]][2] ^ key[k++];
  t[9] = T0[block[13]][2] ^ key[k++];
  t[10] = T0[block[2]][2] ^ key[k++];
  t[11] = T0[block[7]][2] ^ key[k++];
  t[12] = T0[block[12]][2] ^ key[k++];
  t[13] = T0[block[1]][2] ^ key[k++];
  t[14] = T0[block[6]][2] ^ key[k++];
  t[15] = T0[block[11]][2] ^ key[k++];
  for(var i = 0; i < 16; i++)
    block[i] = t[i];
}

/* 
   AES_Decrypt: decrypt the 16 byte array 'block' with the previously 
   expanded key 'key'.
*/

function AES_Decrypt(block, key) {
  var l = key.length;
  AES_AddRoundKey(block, key.slice(l - 16, l));
  AES_ShiftRows(block, AES_ShiftRowTab_Inv);
  AES_SubBytes(block, AES_Sbox_Inv);
  for(var i = l - 32; i >= 16; i -= 16) {
    AES_AddRoundKey(block, key.slice(i, i + 16));
    AES_MixColumns_Inv(block);
    AES_ShiftRows(block, AES_ShiftRowTab_Inv);
    AES_SubBytes(block, AES_Sbox_Inv);
  }
  AES_AddRoundKey(block, key.slice(0, 16));
}

/******************************************************************************/

/* The following lookup tables and functions are for internal use only! */

AES_Sbox = new Array(99,124,119,123,242,107,111,197,48,1,103,43,254,215,171,
  118,202,130,201,125,250,89,71,240,173,212,162,175,156,164,114,192,183,253,
  147,38,54,63,247,204,52,165,229,241,113,216,49,21,4,199,35,195,24,150,5,154,
  7,18,128,226,235,39,178,117,9,131,44,26,27,110,90,160,82,59,214,179,41,227,
  47,132,83,209,0,237,32,252,177,91,106,203,190,57,74,76,88,207,208,239,170,
  251,67,77,51,133,69,249,2,127,80,60,159,168,81,163,64,143,146,157,56,245,
  188,182,218,33,16,255,243,210,205,12,19,236,95,151,68,23,196,167,126,61,
  100,93,25,115,96,129,79,220,34,42,144,136,70,238,184,20,222,94,11,219,224,
  50,58,10,73,6,36,92,194,211,172,98,145,149,228,121,231,200,55,109,141,213,
  78,169,108,86,244,234,101,122,174,8,186,120,37,46,28,166,180,198,232,221,
  116,31,75,189,139,138,112,62,181,102,72,3,246,14,97,53,87,185,134,193,29,
  158,225,248,152,17,105,217,142,148,155,30,135,233,206,85,40,223,140,161,
  137,13,191,230,66,104,65,153,45,15,176,84,187,22);

AES_ShiftRowTab = new Array(0,5,10,15,4,9,14,3,8,13,2,7,12,1,6,11);

function AES_SubBytes(state, sbox) {
  for(var i = 0; i < 16; i++)
    state[i] = sbox[state[i]];  
}

function AES_AddRoundKey(state, rkey) {
  for(var i = 0; i < 16; i++)
    state[i] ^= rkey[i];
}

function AES_ShiftRows(state, shifttab) {
  var h = new Array().concat(state);
  for(var i = 0; i < 16; i++)
    state[i] = h[shifttab[i]];
}

function AES_MixColumns(state) {
  for(var i = 0; i < 16; i += 4) {
    var s0 = state[i + 0], s1 = state[i + 1];
    var s2 = state[i + 2], s3 = state[i + 3];
    var h = s0 ^ s1 ^ s2 ^ s3;
    state[i + 0] ^= h ^ AES_xtime[s0 ^ s1];
    state[i + 1] ^= h ^ AES_xtime[s1 ^ s2];
    state[i + 2] ^= h ^ AES_xtime[s2 ^ s3];
    state[i + 3] ^= h ^ AES_xtime[s3 ^ s0];
  }
}

function AES_MixColumns_Inv(state) {
  for(var i = 0; i < 16; i += 4) {
    var s0 = state[i + 0], s1 = state[i + 1];
    var s2 = state[i + 2], s3 = state[i + 3];
    var h = s0 ^ s1 ^ s2 ^ s3;
    var xh = AES_xtime[h];
    var h1 = AES_xtime[AES_xtime[xh ^ s0 ^ s2]] ^ h;
    var h2 = AES_xtime[AES_xtime[xh ^ s1 ^ s3]] ^ h;
    state[i + 0] ^= h1 ^ AES_xtime[s0 ^ s1];
    state[i + 1] ^= h2 ^ AES_xtime[s1 ^ s2];
    state[i + 2] ^= h1 ^ AES_xtime[s2 ^ s3];
    state[i + 3] ^= h2 ^ AES_xtime[s3 ^ s0];
  }
}
