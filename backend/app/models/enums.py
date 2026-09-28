import enum


class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    MANAGER = "MANAGER"
    BRANCH_STAFF = "BRANCH_STAFF"


class PurchaseOrderStatus(str, enum.Enum):
    PENDING_APPROVAL = "PENDING_APPROVAL"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    ORDERED = "ORDERED"
    PARTIALLY_RECEIVED = "PARTIALLY_RECEIVED"
    RECEIVED = "RECEIVED"
    CANCELLED = "CANCELLED"


class StockTransferStatus(str, enum.Enum):
    REQUESTED = "REQUESTED"
    APPROVED = "APPROVED"
    IN_TRANSIT = "IN_TRANSIT"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class InventoryTransactionType(str, enum.Enum):
    RECEIPT = "RECEIPT"                # stock coming in from a supplier PO
    CONSUMPTION = "CONSUMPTION"        # used up fulfilling a customer order
    WASTE = "WASTE"                    # spoiled / expired / damaged (see WasteLog for the detail/reason)
    ADJUSTMENT = "ADJUSTMENT"          # manual stock correction
    TRANSFER_IN = "TRANSFER_IN"        # received from another branch
    TRANSFER_OUT = "TRANSFER_OUT"      # sent to another branch


class OrderStatus(str, enum.Enum):
    OPEN = "OPEN"                # being built at the register / table
    COMPLETED = "COMPLETED"      # paid & fired -> ingredient stock gets deducted
    CANCELLED = "CANCELLED"      # voided before completion, no stock impact
    REFUNDED = "REFUNDED"        # reversed after completion, stock added back


class WasteReason(str, enum.Enum):
    EXPIRED = "EXPIRED"
    SPOILED = "SPOILED"
    DAMAGED = "DAMAGED"
    PREP_ERROR = "PREP_ERROR"
    OTHER = "OTHER"
