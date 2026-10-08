from odoo import api, fields, models


class StockPickingType(models.Model):
    _inherit = 'stock.picking.type'

    code = fields.Selection(
        selection_add=[('burn', 'Burn'), ('wipe', 'Wipe')],
        ondelete={'burn': 'set default', 'wipe': 'set default'},
    )

    @api.depends('code')
    def _compute_show_picking_type(self):
        super()._compute_show_picking_type()
        for record in self:
            if record.code in ('burn', 'wipe'):
                record.show_picking_type = True
