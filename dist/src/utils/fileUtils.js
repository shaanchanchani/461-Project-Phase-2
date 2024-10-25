"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readUrlsFromFile = readUrlsFromFile;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/*
  Function Name: readUrlsFromFile
  Description: This function reads URLs from a file, where each line contains a URL, and returns them as an array of strings.
  @params:
    - filePath: string - The path to the file containing the URLs.
  @returns: Promise<string[]> - A promise that resolves to an array of URLs read from the file.
*/
async function readUrlsFromFile(filePath) {
    return new Promise((resolve, reject) => {
        // Get the absolute path to the file
        const absolutePath = path.resolve(filePath);
        // Read the file asynchronously
        fs.readFile(absolutePath, "utf8", (err, data) => {
            if (err) {
                // Reject the promise if an error occurs while reading the file
                reject(`Error reading file: ${err.message}`);
            }
            else {
                // Split the file content by line and filter out any empty lines
                const urls = data.trim().split("\n").filter(Boolean);
                resolve(urls); // Resolve the promise with the array of URLs
            }
        });
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZVV0aWxzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL3V0aWxzL2ZpbGVVdGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBV0EsNENBaUJDO0FBNUJELHVDQUF5QjtBQUN6QiwyQ0FBNkI7QUFFN0I7Ozs7OztFQU1FO0FBRUssS0FBSyxVQUFVLGdCQUFnQixDQUFDLFFBQWdCO0lBQ3JELE9BQU8sSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7UUFDckMsb0NBQW9DO1FBQ3BDLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7UUFFNUMsK0JBQStCO1FBQy9CLEVBQUUsQ0FBQyxRQUFRLENBQUMsWUFBWSxFQUFFLE1BQU0sRUFBRSxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsRUFBRTtZQUM5QyxJQUFJLEdBQUcsRUFBRSxDQUFDO2dCQUNSLCtEQUErRDtnQkFDL0QsTUFBTSxDQUFDLHVCQUF1QixHQUFHLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztZQUMvQyxDQUFDO2lCQUFNLENBQUM7Z0JBQ04sZ0VBQWdFO2dCQUNoRSxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFDckQsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsNkNBQTZDO1lBQzlELENBQUM7UUFDSCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyJ9