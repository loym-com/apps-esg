from odoo import api, fields, models


class ProductCategory(models.Model):
    _inherit = 'product.category'

    token_category = fields.Selection(
        selection=[
            ('carbon_credits', 'Carbon Credits'),
            ('other', 'Other'),
        ],
        string="Token Category",
    )
    parent_token_category = fields.Selection(
        related='parent_id.token_category',
        string="Parent Token Category",
    )

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            parent_id = vals.get('parent_id')
            if not parent_id:
                continue
            parent = self.browse(parent_id)
            if parent.token_category:
                vals['token_category'] = parent.token_category
        return super().create(vals_list)

    def write(self, vals):
        should_propagate = (
            'token_category' in vals
            and not self.env.context.get('skip_token_propagation')
        )
        res = super().write(vals)

        if should_propagate:
            token_category = vals.get('token_category') or False
            descendants = self.search([
                ('id', 'child_of', self.ids),
                ('id', 'not in', self.ids),
            ])
            if descendants:
                descendants.with_context(skip_token_propagation=True).write({
                    'token_category': token_category,
                })

        return res
