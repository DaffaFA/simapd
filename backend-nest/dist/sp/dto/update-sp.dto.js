"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateSpDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_sp_dto_1 = require("./create-sp.dto");
class UpdateSpDto extends (0, mapped_types_1.PartialType)(create_sp_dto_1.CreateSpDto) {
}
exports.UpdateSpDto = UpdateSpDto;
//# sourceMappingURL=update-sp.dto.js.map